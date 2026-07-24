use serde::{Deserialize, Serialize};
use time::{OffsetDateTime};

#[derive(Serialize, Deserialize)]
pub struct RecordData(pub Vec<i64>, pub Vec<u32>);

impl RecordData {
    pub fn into_binary(self) -> Vec<u8> {
        let (mut timestamps, values) = (self.0, self.1);
        let len = timestamps.len() as u32;

        let mut bytes = Vec::with_capacity(4 + 8 + (len as usize * 8));
        
        // 1. Write the number of items
        bytes.extend_from_slice(&len.to_le_bytes());

        if len == 0 {
            // Write base timestamp as 0 if empty
            bytes.extend_from_slice(&0i64.to_le_bytes());
            return bytes;
        }

        // 2. Write the base timestamp
        let base_timestamp = timestamps[0];
        bytes.extend_from_slice(&base_timestamp.to_le_bytes());

        // 3. Write all delta timestamps
        for ts in &timestamps {
            let delta = (ts - base_timestamp) as u32;
            bytes.extend_from_slice(&delta.to_le_bytes());
        }

        // 4. Write all values
        for val in &values {
            bytes.extend_from_slice(&val.to_le_bytes());
        }

        bytes
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Record {
    #[serde(skip_serializing)]
    pub server_id: u32,

    #[serde(with = "time::serde::timestamp")]
    pub date: OffsetDateTime,
    pub value: u32
}
