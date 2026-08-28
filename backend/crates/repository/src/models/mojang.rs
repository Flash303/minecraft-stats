use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Debug)]
pub struct MojangApiStatus {
    pub is_down: bool,
    #[serde(with = "time::serde::timestamp")]
    pub updated_at: OffsetDateTime,
}

#[derive(Serialize, Deserialize, Debug, sqlx::FromRow)]
pub struct MojangApiDowntime {
    pub id: i32,
    #[serde(with = "time::serde::timestamp")]
    pub start_time: OffsetDateTime,
    #[serde(with = "time::serde::timestamp::option")]
    pub end_time: Option<OffsetDateTime>,
}
