use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Server {
    pub id: u32,
    pub name: String,

    pub ip: String,
    pub port: u16,
    pub last_favicon: Option<String>,
}