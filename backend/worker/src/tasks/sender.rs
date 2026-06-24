use crate::tasks::communication::VerifierToSender;
use repository::models::alert::AlertType;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use serde_json::json;
use std::collections::HashMap;
use std::env;
use std::io::Cursor;
use tokio::sync::mpsc::Receiver;
use web_push::*;

pub async fn sender_worker(
    repository: PostgresRepository,
    mut rx: Receiver<VerifierToSender>,
) {
    println!("Sender task started");

    let private_key_pem = env::var("VAPID_PRIVATE_KEY").ok();
    if private_key_pem.is_none() {
        println!("WARNING: VAPID_PRIVATE_KEY is not set. Web Push notifications will be disabled.");
    }

    let mailto = env::var("VAPID_MAILTO").unwrap_or_else(|_| "mailto:admin@localhost".to_string());

    // Create client once to reuse connection pools across all push requests
    let client = match IsahcWebPushClient::new() {
        Ok(c) => c,
        Err(e) => {
            println!("Sender critical error creating WebPushClient: {:?}", e);
            return;
        }
    };

    // Pre-parse the VAPID key once
    let partial_vapid_builder = private_key_pem.as_ref().and_then(|key_pem| {
        let trimmed_key = key_pem.trim();
        if trimmed_key.starts_with("-----BEGIN") {
            VapidSignatureBuilder::from_pem_no_sub(Cursor::new(trimmed_key.as_bytes())).ok()
        } else {
            VapidSignatureBuilder::from_base64_no_sub(trimmed_key).ok()
        }
    });

    if partial_vapid_builder.is_none() && private_key_pem.is_some() {
        println!("Sender critical error parsing VAPID key");
    }

    while let Some(message) = rx.recv().await {
        let notifications = match message {
            VerifierToSender::TriggerNotifications(notifs) => notifs,
        };

        if notifications.is_empty() {
            continue;
        }

        let Some(ref pb) = partial_vapid_builder else {
            continue;
        };

        // Extract all unique user IDs to fetch subscriptions in bulk
        let mut user_ids = Vec::new();
        for notif in &notifications {
            let uid = notif.alert.user_id.clone();
            if !user_ids.contains(&uid) {
                user_ids.push(uid);
            }
        }

        // Fetch device subscriptions for the users in batch
        let subscriptions = match repository.get_subscriptions_for_users(&user_ids).await {
            Ok(subs) => subs,
            Err(e) => {
                println!("Sender error fetching subscriptions for batch: {:?}", e);
                continue;
            }
        };

        if subscriptions.is_empty() {
            continue;
        }

        // Group subscriptions by user_id
        let mut subs_by_user = HashMap::new();
        for sub in subscriptions {
            subs_by_user.entry(sub.user_id.clone()).or_insert_with(Vec::new).push(sub);
        }

        for notification in notifications {
            let Some(subs) = subs_by_user.get(&notification.alert.user_id) else {
                continue;
            };

            let message_title = format!("Alerte Serveur: {}", notification.server_name);
            let message_body = match notification.alert.alert_type {
                AlertType::StatusToOffline => format!("Le serveur {} vient de passer HORS-LIGNE !", notification.server_name),
                AlertType::StatusToOnline => format!("Le serveur {} est de nouveau EN LIGNE !", notification.server_name),
                AlertType::PlayerAbove => {
                    let current = notification.new_players.unwrap_or(0);
                    let threshold = notification.alert.player_threshold.unwrap_or(0);
                    format!("Le nombre de joueurs sur {} a dépassé {} (Actuel : {}) !", notification.server_name, threshold, current)
                }
                AlertType::PlayerBelow => {
                    let current = notification.new_players.unwrap_or(0);
                    let threshold = notification.alert.player_threshold.unwrap_or(0);
                    format!("Le nombre de joueurs sur {} est descendu en-dessous de {} (Actuel : {}) !", notification.server_name, threshold, current)
                }
            };

            let payload = json!({
                "title": message_title,
                "body": message_body,
                "icon": notification.get_logo(),
                "url": format!("/servers/{}", notification.alert.server_id)
            });

            let payload_string = payload.to_string();

            for sub in subs {
                let repository_clone = repository.clone();
                let client_clone = client.clone();
                
                let payload_clone = payload_string.clone();
                let mailto_clone = mailto.clone();
                let sub_clone = sub.clone();
                
                // Clone the pre-parsed partial builder
                let pb_clone = pb.clone();

                tokio::spawn(async move {
                    let clean_p256dh = sub_clone.p256dh.replace('+', "-").replace('/', "_").replace('=', "");
                    let clean_auth = sub_clone.auth.replace('+', "-").replace('/', "_").replace('=', "");

                    let subscription_info = SubscriptionInfo::new(
                        sub_clone.endpoint.clone(),
                        clean_p256dh,
                        clean_auth,
                    );

                    let mut sig_builder = pb_clone.add_sub_info(&subscription_info);
                    sig_builder.add_claim("sub", mailto_clone.as_str());

                    let signature = match sig_builder.build() {
                        Ok(sig) => sig,
                        Err(e) => {
                            println!("Sender error signing VAPID claims for device ID {}: {:?}", sub_clone.id, e);
                            return;
                        }
                    };

                    let mut builder = WebPushMessageBuilder::new(&subscription_info);
                    builder.set_payload(ContentEncoding::Aes128Gcm, payload_clone.as_bytes());
                    builder.set_vapid_signature(signature);

                    let message = match builder.build() {
                        Ok(msg) => msg,
                        Err(e) => {
                            println!("Sender error building push message for device ID {}: {:?}", sub_clone.id, e);
                            return;
                        }
                    };

                    match client_clone.send(message).await {
                        Ok(_) => {
                            println!("Push notification sent successfully to device ID {}", sub_clone.id);
                        }
                        Err(WebPushError::EndpointNotValid(_)) | Err(WebPushError::EndpointNotFound(_)) => {
                            println!("Device subscription expired or invalid (404/410), deleting endpoint: {}", sub_clone.endpoint);
                            let _ = repository_clone.delete_stale_subscription(&sub_clone.endpoint).await;
                        }
                        Err(e) => {
                            println!("Failed to send Web Push to device ID {}: {:?}", sub_clone.id, e);
                        }
                    }
                });
            }
        }
    }
}
