use serde::{Deserialize, Serialize};
use time::{OffsetDateTime};

#[derive(Serialize, Deserialize, Debug)]
pub struct Record {
    pub server_id: String,
    pub date: OffsetDateTime,
    pub value: u32
}