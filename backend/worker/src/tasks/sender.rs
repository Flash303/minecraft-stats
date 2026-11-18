use crate::tasks::communication::{TriggeredAlertNotification, VerifierToSender};
use log::{error, info};
use repository::models::alert::AlertType;
use repository::models::web_push::WebPushSubscription;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use serde_json::json;
use std::collections::HashMap;
use std::env;
use std::io::Cursor;
use tokio::sync::mpsc::Receiver;
use tokio::task::JoinHandle;
use web_push::*;

const PRIVATE_KEY_START: &str = "-----BEGIN";
const PRIVATE_KEY_END: &str = "-----END";

pub struct SenderTask {
    repository: PostgresRepository,
    client: IsahcWebPushClient,
    mailto: String,
    vapid_builder: PartialVapidSignatureBuilder,
}

impl SenderTask {
    pub fn new(repo: &PostgresRepository) -> Result<Self, &'static str> {
        // get private key
        let private_key_pem = Self::retrieve_private_key()?;

        // get mailto mail
        let mailto = env::var("VAPID_MAILTO")
            .ok()
            .filter(|v| !v.trim().is_empty())
            .ok_or("VAPID_MAILTO is not set or empty")?;

        // create the client
        let client = Self::create_webpush_client()?;
        let vapid_builder = Self::create_vapid_builder(&private_key_pem)?;

        Ok(Self {
            repository: repo.clone(),
            client,
            mailto,
            vapid_builder,
        })
    }

    // Creator methods
    fn create_vapid_builder(
        private_key: &str,
    ) -> Result<PartialVapidSignatureBuilder, &'static str> {
        let trimmed = private_key.trim();
        if trimmed.is_empty() {
            return Err("Key empty");
        }

        if trimmed.starts_with(PRIVATE_KEY_START) {
            if !trimmed.contains(PRIVATE_KEY_END) {
                return Err("Invalid pem key");
            }

            return VapidSignatureBuilder::from_pem_no_sub(Cursor::new(trimmed.as_bytes()))
                .map_err(|_| "Could not create the VAPID signature from PEM");
        }

        let unpadded = trimmed.trim_end_matches('=');
        let is_valid_b64_chars = unpadded
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_' || b == b'+' || b == b'/');

        if unpadded.len() == 43 && is_valid_b64_chars {
            return VapidSignatureBuilder::from_base64_no_sub(unpadded)
                .map_err(|_| "Could not parse from base64");
        }

        Err("Incorrect key format / length")
    }

    fn retrieve_private_key() -> Result<String, &'static str> {
        let key = env::var("VAPID_PRIVATE_KEY").map_err(|_| "VAPID_PRIVATE_KEY is not set")?;
        if key.trim().is_empty() {
            return Err("VAPID_PRIVATE_KEY is empty");
        }

        Ok(key)
    }

    fn create_webpush_client() -> Result<IsahcWebPushClient, &'static str> {
        IsahcWebPushClient::new().map_err(|e| {
            error!("Sender critical error creating WebPushClient: {:?}", e);
            "Failed to create the web push client"
        })
    }

    // Task methods
    pub fn start(self, rx: Receiver<VerifierToSender>) -> JoinHandle<()> {
        tokio::spawn(async move {
            self.run(rx).await;
        })
    }

    async fn run(self, mut rx: Receiver<VerifierToSender>) {
        while let Some(message) = rx.recv().await {
            let VerifierToSender::TriggerNotifications(notifications) = message;
            if notifications.is_empty() {
                continue;
            }

            // Extract all unique user IDs to fetch subscriptions in bulk
            let mut user_ids = Vec::new();
            for notif in &notifications {
                let uid = notif.alert.user_id.clone();
                if !user_ids.contains(&uid) {
                    user_ids.push(uid);
                }
            }

            // Fetch device subscriptions for the users in batch
            let subscriptions = match self.repository.get_subscriptions_for_users(&user_ids).await {
                Ok(subs) => subs,
                Err(e) => {
                    info!("Sender error fetching subscriptions for batch: {:?}", e);
                    continue;
                }
            };

            if subscriptions.is_empty() {
                continue;
            }

            // Group subscriptions by user_id
            let mut subs_by_user = HashMap::new();
            for sub in subscriptions {
                subs_by_user
                    .entry(sub.user_id.clone())
                    .or_insert_with(Vec::new)
                    .push(sub);
            }

            for notification in notifications {
                let Some(subs) = subs_by_user.get(&notification.alert.user_id) else {
                    continue;
                };

                let payload_string = Self::create_notification_payload(&notification);

                for sub in subs {
                    let repository_clone = self.repository.clone();
                    let client_clone = self.client.clone();

                    let payload_clone = payload_string.clone();
                    let mailto_clone = self.mailto.clone();
                    let sub_clone = sub.clone();

                    // Clone the pre-parsed partial builder
                    let pb_clone = self.vapid_builder.clone();

                    tokio::spawn(async move {
                        let (signature, subscription_info) =
                            match Self::create_signature(&sub_clone, pb_clone, &mailto_clone) {
                                Ok(sig) => sig,
                                Err(e) => {
                                    info!("{}", e);
                                    return;
                                }
                            };

                        let mut builder = WebPushMessageBuilder::new(&subscription_info);
                        builder.set_payload(ContentEncoding::Aes128Gcm, payload_clone.as_bytes());
                        builder.set_vapid_signature(signature);

                        let message = match builder.build() {
                            Ok(msg) => msg,
                            Err(e) => {
                                info!(
                                    "Sender error building push message for device ID {}: {:?}",
                                    sub_clone.id, e
                                );
                                return;
                            }
                        };

                        match client_clone.send(message).await {
                            Ok(_) => {
                                info!(
                                    "Push notification sent successfully to device ID {}",
                                    sub_clone.id
                                );
                            }
                            Err(WebPushError::EndpointNotValid(_))
                            | Err(WebPushError::EndpointNotFound(_)) => {
                                info!(
                                    "Device subscription expired or invalid (404/410), deleting endpoint: {}",
                                    sub_clone.endpoint
                                );
                                let _ = repository_clone
                                    .delete_stale_subscription(&sub_clone.endpoint)
                                    .await;
                            }
                            Err(e) => {
                                info!(
                                    "Failed to send Web Push to device ID {}: {:?}",
                                    sub_clone.id, e
                                );
                            }
                        }
                    });
                }
            }
        }
    }

    // Task utilities
    fn create_signature(
        sub: &WebPushSubscription,
        pb: PartialVapidSignatureBuilder,
        mailto: &str,
    ) -> Result<(VapidSignature, SubscriptionInfo), String> {
        let clean_p256dh = sub
            .p256dh
            .replace('+', "-")
            .replace('/', "_")
            .replace('=', "");
        let clean_auth = sub
            .auth
            .replace('+', "-")
            .replace('/', "_")
            .replace('=', "");

        let subscription_info = SubscriptionInfo::new(
            sub.endpoint.as_str(),
            clean_p256dh.as_str(),
            clean_auth.as_str(),
        );

        let mut sig_builder = pb.add_sub_info(&subscription_info);
        sig_builder.add_claim("sub", mailto);

        sig_builder
            .build()
            .map(|signature| (signature, subscription_info))
            .map_err(|e| {
                format!(
                    "Sender error signing VAPID claims for device ID {}: {:?}",
                    sub.id, e
                )
            })
    }

    fn create_notification_payload(notification: &TriggeredAlertNotification) -> String {
        json!({
            "title": Self::create_message_title(notification),
            "body": Self::create_message_body(notification),
            "icon": notification.get_logo(),
            "url": format!("/server/{}", notification.alert.server_id)
        })
        .to_string()
    }

    fn create_message_title(notification: &TriggeredAlertNotification) -> String {
        format!("Alerte Serveur: {}", notification.server_name)
    }

    fn create_message_body(notification: &TriggeredAlertNotification) -> String {
        match notification.alert.alert_type {
            AlertType::StatusToOffline => format!(
                "Le serveur {} vient de passer HORS-LIGNE !",
                notification.server_name
            ),
            AlertType::StatusToOnline => format!(
                "Le serveur {} est de nouveau EN LIGNE !",
                notification.server_name
            ),
            AlertType::PlayerAbove => {
                let current = notification.new_players.unwrap_or(0);
                let threshold = notification.alert.player_threshold.unwrap_or(0);
                format!(
                    "Le nombre de joueurs sur {} a dépassé {} (Actuel : {}) !",
                    notification.server_name, threshold, current
                )
            }
            AlertType::PlayerBelow => {
                let current = notification.new_players.unwrap_or(0);
                let threshold = notification.alert.player_threshold.unwrap_or(0);
                format!(
                    "Le nombre de joueurs sur {} est descendu en-dessous de {} (Actuel : {}) !",
                    notification.server_name, threshold, current
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::models::alert::Alert;
    use repository::models::server::ServerStatus;
    use serde_json::Value;
    use time::OffsetDateTime;

    /// Throwaway P-256 private key, generated for these tests only.
    const TEST_PRIVATE_KEY_PEM: &str = "-----BEGIN EC PRIVATE KEY-----\n\
        MHcCAQEEIBfU5jZuN+r7MegcTJPK2+CAanRpppsTx9fQoUcLYNRgoAoGCCqGSM49\n\
        AwEHoUQDQgAEBQichdJasclGlxecNXoqFEhg0HmV7+sfqjVSRDn8DbZeH57qngA1\n\
        d3vZJG9Qb9sFXdMzFc+9HA7ZXCOHFlqxCg==\n\
        -----END EC PRIVATE KEY-----\n";

    /// 32-byte private key, base64url encoded without padding (43 chars).
    const TEST_PRIVATE_KEY_B64: &str = "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY";

    fn key_error(key: &str) -> &'static str {
        match SenderTask::create_vapid_builder(key) {
            Ok(_) => panic!("key should have been rejected: {key:?}"),
            Err(e) => e,
        }
    }

    #[test]
    fn accepts_base64url_key() {
        assert!(SenderTask::create_vapid_builder(TEST_PRIVATE_KEY_B64).is_ok());
    }

    #[test]
    fn accepts_padded_base64url_key() {
        // Padding must be stripped before decoding, the URL-safe no-pad
        // decoder rejects '=' (regression guard).
        let padded = format!("{TEST_PRIVATE_KEY_B64}=");
        assert!(SenderTask::create_vapid_builder(&padded).is_ok());
    }

    #[test]
    fn accepts_surrounding_whitespace() {
        let key = format!("\n  {TEST_PRIVATE_KEY_B64}  \n");
        assert!(SenderTask::create_vapid_builder(&key).is_ok());
    }

    #[test]
    fn accepts_pem_key() {
        assert!(SenderTask::create_vapid_builder(TEST_PRIVATE_KEY_PEM).is_ok());
    }

    #[test]
    fn rejects_empty_key() {
        assert_eq!(key_error(""), "Key empty");
        assert_eq!(key_error("  \n\t "), "Key empty");
    }

    #[test]
    fn rejects_wrong_length() {
        assert_eq!(
            key_error(&TEST_PRIVATE_KEY_B64[..42]),
            "Incorrect key format / length"
        );

        let long = format!("{TEST_PRIVATE_KEY_B64}a");
        assert_eq!(key_error(&long), "Incorrect key format / length");
    }

    #[test]
    fn rejects_invalid_characters() {
        let key = format!("{}!", &TEST_PRIVATE_KEY_B64[..42]);
        assert_eq!(key_error(&key), "Incorrect key format / length");
    }

    #[test]
    fn rejects_pem_without_end_marker() {
        let key = "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEE\n";
        assert_eq!(key_error(key), "Invalid pem key");
    }

    #[test]
    fn rejects_broken_pem() {
        let key = "-----BEGIN EC PRIVATE KEY-----\nnot-a-pem-body\n-----END EC PRIVATE KEY-----\n";
        assert_eq!(
            key_error(key),
            "Could not create the VAPID signature from PEM"
        );
    }

    fn notification(
        alert_type: AlertType,
        player_threshold: Option<u32>,
        new_players: Option<i32>,
    ) -> TriggeredAlertNotification {
        TriggeredAlertNotification {
            alert: Alert {
                id: 1,
                user_id: "user_1".to_string(),
                server_id: 42,
                alert_type,
                player_threshold,
                is_active: true,
                created_at: OffsetDateTime::now_utc(),
            },
            server_name: "Mon Serveur".to_string(),
            _old_status: Some(ServerStatus::Online),
            _old_players: Some(0),
            _new_status: ServerStatus::Offline,
            new_players,
        }
    }

    #[test]
    fn formats_title() {
        assert_eq!(
            SenderTask::create_message_title(&notification(AlertType::StatusToOffline, None, None)),
            "Alerte Serveur: Mon Serveur"
        );
    }

    #[test]
    fn formats_status_messages() {
        assert_eq!(
            SenderTask::create_message_body(&notification(AlertType::StatusToOffline, None, None)),
            "Le serveur Mon Serveur vient de passer HORS-LIGNE !"
        );
        assert_eq!(
            SenderTask::create_message_body(&notification(AlertType::StatusToOnline, None, None)),
            "Le serveur Mon Serveur est de nouveau EN LIGNE !"
        );
    }

    #[test]
    fn formats_player_messages() {
        assert_eq!(
            SenderTask::create_message_body(&notification(
                AlertType::PlayerAbove,
                Some(10),
                Some(15)
            )),
            "Le nombre de joueurs sur Mon Serveur a dépassé 10 (Actuel : 15) !"
        );
        assert_eq!(
            SenderTask::create_message_body(&notification(
                AlertType::PlayerBelow,
                Some(10),
                Some(3)
            )),
            "Le nombre de joueurs sur Mon Serveur est descendu en-dessous de 10 (Actuel : 3) !"
        );
    }

    #[test]
    fn formats_missing_values_as_zero() {
        let notification = notification(AlertType::PlayerAbove, None, None);
        assert_eq!(
            SenderTask::create_message_body(&notification),
            "Le nombre de joueurs sur Mon Serveur a dépassé 0 (Actuel : 0) !"
        );
    }

    #[test]
    fn builds_payload() {
        let raw = SenderTask::create_notification_payload(&notification(
            AlertType::StatusToOffline,
            None,
            None,
        ));
        let payload: Value = serde_json::from_str(&raw).expect("payload should be valid JSON");

        assert_eq!(payload["title"], "Alerte Serveur: Mon Serveur");
        assert_eq!(
            payload["body"],
            "Le serveur Mon Serveur vient de passer HORS-LIGNE !"
        );
        assert_eq!(payload["url"], "/server/42");
        assert!(!payload["icon"].as_str().unwrap_or_default().is_empty());
    }
}
