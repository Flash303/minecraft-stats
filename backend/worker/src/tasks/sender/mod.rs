use std::collections::{HashMap, HashSet};
use std::env;

use futures::{StreamExt, stream};
use log::{debug, error, info, warn};
use repository::models::web_push::WebPushSubscription;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use tokio::sync::mpsc::Receiver;
use web_push::{
    ContentEncoding, IsahcWebPushClient, PartialVapidSignatureBuilder, WebPushClient, WebPushError,
    WebPushMessageBuilder,
};

use crate::tasks::communication::{TriggeredAlertNotification, VerifierToSender};

pub mod message;
pub mod vapid;

const MAX_CONCURRENT_SEND: usize = 20;

pub struct SenderTask {
    repository: PostgresRepository,
    client: IsahcWebPushClient,
    mailto: String,
    vapid_builder: PartialVapidSignatureBuilder,
}

impl SenderTask {
    pub fn new(repo: &PostgresRepository) -> Result<Self, &'static str> {
        let private_key_pem = Self::retrieve_private_key()?;

        let mailto = env::var("VAPID_MAILTO")
            .ok()
            .filter(|v| !v.trim().is_empty())
            .ok_or("VAPID_MAILTO is not set or empty")?;

        let client = Self::create_webpush_client()?;
        let vapid_builder = Self::create_vapid_builder(&private_key_pem)?;

        Ok(Self {
            repository: repo.clone(),
            client,
            mailto,
            vapid_builder,
        })
    }

    fn create_webpush_client() -> Result<IsahcWebPushClient, &'static str> {
        IsahcWebPushClient::new().map_err(|e| {
            error!("Sender critical error creating WebPushClient: {:?}", e);
            "Failed to create the web push client"
        })
    }

    pub async fn run(self, mut rx: Receiver<VerifierToSender>) {
        while let Some(VerifierToSender::TriggerNotifications(notifications)) = rx.recv().await {
            if !notifications.is_empty() {
                self.dispatch(notifications).await;
            }
        }
    }

    async fn dispatch(&self, notifications: Vec<TriggeredAlertNotification>) {
        let user_ids: Vec<String> = notifications
            .iter()
            .map(|notification| notification.alert.user_id.as_str())
            .collect::<HashSet<_>>()
            .into_iter()
            .map(str::to_owned)
            .collect();

        let subscriptions = match self.repository.get_subscriptions_for_users(&user_ids).await {
            Ok(subscriptions) => subscriptions,
            Err(e) => {
                warn!("Sender error fetching subscriptions for batch: {e:?}");
                return;
            }
        };

        if subscriptions.is_empty() {
            return;
        }

        let subscriptions_by_user = Self::group_by_user(&subscriptions);

        let deliveries: Vec<(WebPushSubscription, String)> = notifications
            .iter()
            .flat_map(|notification| {
                let payload = Self::create_notification_payload(notification);

                subscriptions_by_user
                    .get(notification.alert.user_id.as_str())
                    .into_iter()
                    .flatten()
                    .map(move |subscription| ((*subscription).clone(), payload.clone()))
            })
            .collect();

        stream::iter(deliveries)
            .map(move |(subscription, payload)| async move {
                self.deliver(&subscription, &payload).await
            })
            .buffer_unordered(MAX_CONCURRENT_SEND)
            .for_each(|()| async {})
            .await;
    }

    async fn deliver(&self, subscription: &WebPushSubscription, payload: &str) {
        let subscription_info = Self::subscription_info(subscription);

        let signature = match Self::sign(&self.vapid_builder, &subscription_info, &self.mailto) {
            Ok(signature) => signature,
            Err(e) => {
                warn!("{e}");
                return;
            }
        };

        let mut builder = WebPushMessageBuilder::new(&subscription_info);
        builder.set_payload(ContentEncoding::Aes128Gcm, payload.as_bytes());
        builder.set_vapid_signature(signature);

        let message = match builder.build() {
            Ok(message) => message,
            Err(e) => {
                warn!(
                    "Sender error building push message for device ID {}: {:?}",
                    subscription.id, e
                );
                return;
            }
        };

        match self.client.send(message).await {
            Ok(()) => debug!(
                "Push notification sent successfully to device ID {}",
                subscription.id
            ),
            Err(WebPushError::EndpointNotValid(_) | WebPushError::EndpointNotFound(_)) => {
                info!(
                    "Device subscription expired or invalid (404/410), deleting endpoint: {}",
                    subscription.endpoint
                );

                if let Err(e) = self
                    .repository
                    .delete_stale_subscription(&subscription.endpoint)
                    .await
                {
                    warn!(
                        "Sender error deleting stale subscription for device ID {}: {e:?}",
                        subscription.id
                    );
                }
            }
            Err(e) => warn!(
                "Failed to send Web Push to device ID {}: {:?}",
                subscription.id, e
            ),
        }
    }

    fn group_by_user(
        subscriptions: &[WebPushSubscription],
    ) -> HashMap<&str, Vec<&WebPushSubscription>> {
        let mut subscriptions_by_user: HashMap<&str, Vec<&WebPushSubscription>> = HashMap::new();

        for subscription in subscriptions {
            subscriptions_by_user
                .entry(subscription.user_id.as_str())
                .or_default()
                .push(subscription);
        }

        subscriptions_by_user
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use time::OffsetDateTime;

    fn subscription(id: u32, user_id: &str) -> WebPushSubscription {
        WebPushSubscription {
            id,
            user_id: user_id.to_string(),
            endpoint: format!("https://push.example.com/{id}"),
            p256dh: "p256dh".to_string(),
            auth: "auth".to_string(),
            created_at: OffsetDateTime::now_utc(),
        }
    }

    #[test]
    fn groups_subscriptions_by_user() {
        let subscriptions = vec![
            subscription(1, "user_1"),
            subscription(2, "user_2"),
            subscription(3, "user_1"),
        ];

        let grouped = SenderTask::group_by_user(&subscriptions);

        assert_eq!(grouped.len(), 2);
        assert_eq!(grouped["user_1"].len(), 2);
        assert_eq!(grouped["user_2"].len(), 1);
    }

    #[test]
    fn groups_no_subscriptions() {
        assert!(SenderTask::group_by_user(&[]).is_empty());
    }
}
