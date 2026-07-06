use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct WebPushSubscription {
    pub id: u32,
    pub user_id: String,

    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,

    pub created_at: OffsetDateTime,
}

#[derive(FromRow)]
pub struct WebPushSubscriptionRow {
    pub id: i32,
    pub user_id: String,

    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,

    pub created_at: OffsetDateTime,
}

impl From<WebPushSubscriptionRow> for WebPushSubscription {
    fn from(row: WebPushSubscriptionRow) -> Self {
        Self {
            id: row.id as u32,
            user_id: row.user_id,
            endpoint: row.endpoint,
            p256dh: row.p256dh,
            auth: row.auth,
            created_at: row.created_at,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DraftWebPushSubscription {
    pub user_id: String,

    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
}
