use serde::{Deserialize, Serialize};
use time::{OffsetDateTime};

#[derive(Serialize, Deserialize, Debug)]
pub struct Record {
    pub server_id: u32,
    pub date: OffsetDateTime,
    pub value: u32
}