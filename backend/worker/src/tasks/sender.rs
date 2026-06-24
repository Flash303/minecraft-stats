use crate::tasks::communication::VerifierToSender;
use repository::models::alert::AlertType;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use serde_json::json;
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

    while let Some(message) = rx.recv().await {
        match message {
            VerifierToSender::TriggerNotification(notification) => {
                let Some(ref key_pem) = private_key_pem else {
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
                    "icon": "/logo.png",
                    "url": format!("/servers/{}", notification.alert.server_id)
                });

                let payload_string = payload.to_string();

                // Fetch device subscriptions for the user
                let subscriptions_result = repository.get_subscriptions_for_users(&[notification.alert.user_id.clone()]).await;
                let subscriptions = match subscriptions_result {
                    Ok(subs) => subs,
                    Err(e) => {
                        println!("Sender error fetching subscriptions for user {}: {:?}", notification.alert.user_id, e);
                        continue;
                    }
                };

                for sub in subscriptions {
                    let repository_clone = repository.clone();
                    let client_clone = client.clone();
                    
                    let payload_clone = payload_string.clone();

                    let key_pem_clone = key_pem.clone();
                    let mailto_clone = mailto.clone();

                    tokio::spawn(async move {
                        let clean_p256dh = sub.p256dh.replace('+', "-").replace('/', "_").replace('=', "");
                        let clean_auth = sub.auth.replace('+', "-").replace('/', "_").replace('=', "");

                        let subscription_info = SubscriptionInfo::new(
                            sub.endpoint.clone(),
                            clean_p256dh,
                            clean_auth,
                        );

                        // Build VAPID signature builder from PEM bytes or base64
                        let trimmed_key = key_pem_clone.trim();
                        let sig_result = if trimmed_key.starts_with("-----BEGIN") {
                            VapidSignatureBuilder::from_pem(
                                Cursor::new(trimmed_key.as_bytes()),
                                &subscription_info
                            )
                        } else {
                            VapidSignatureBuilder::from_base64(
                                trimmed_key,
                                &subscription_info
                            )
                        };

                        let mut sig_builder = match sig_result {
                            Ok(builder) => builder,
                            Err(e) => {
                                println!("Sender error parsing VAPID key for device ID {}: {:?}", sub.id, e);
                                return;
                            }
                        };

                        // Add contact email claim required by web push servers
                        sig_builder.add_claim("sub", mailto_clone.as_str());

                        let signature = match sig_builder.build() {
                            Ok(sig) => sig,
                            Err(e) => {
                                println!("Sender error signing VAPID claims for device ID {}: {:?}", sub.id, e);
                                return;
                            }
                        };

                        let mut builder = WebPushMessageBuilder::new(&subscription_info);
                        builder.set_payload(ContentEncoding::Aes128Gcm, payload_clone.as_bytes());
                        builder.set_vapid_signature(signature);

                        let message = match builder.build() {
                            Ok(msg) => msg,
                            Err(e) => {
                                println!("Sender error building push message for device ID {}: {:?}", sub.id, e);
                                return;
                            }
                        };

                        match client_clone.send(message).await {
                            Ok(_) => {
                                println!("Push notification sent successfully to device ID {}", sub.id);
                            }
                            Err(WebPushError::EndpointNotValid(_)) | Err(WebPushError::EndpointNotFound(_)) => {
                                println!("Device subscription expired or invalid (404/410), deleting endpoint: {}", sub.endpoint);
                                let _ = repository_clone.delete_stale_subscription(&sub.endpoint).await;
                            }
                            Err(e) => {
                                println!("Failed to send Web Push to device ID {}: {:?}", sub.id, e);
                            }
                        }
                    });
                }
            }
        }
    }
}
