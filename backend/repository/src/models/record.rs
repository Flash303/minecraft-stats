use serde::{Deserialize, Serialize};
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
