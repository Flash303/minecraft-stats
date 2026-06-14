use serde::{Deserialize, Serialize};
use sqlx::prelude::FromRow;
use time::{OffsetDateTime};

#[derive(Serialize, Deserialize)]
pub struct RecordData(pub Vec<i64>, pub Vec<u32>);

#[derive(Serialize, Deserialize, Debug)]
pub struct Record {
    #[serde(skip_serializing)]
    pub server_id: u32,

    #[serde(with = "time::serde::timestamp")]
    pub date: OffsetDateTime,
    pub value: u32
}

#[derive(FromRow)]
pub struct RecordRow {
    server_id: i32,
    date: OffsetDateTime,
    value: i32
}

impl From<RecordRow> for Record {
    fn from(row: RecordRow) -> Self {
        Self {
            server_id: row.server_id as u32,
            date: row.date,
            value: row.value as u32
        }
    }
}
