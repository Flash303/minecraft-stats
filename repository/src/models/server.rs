use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Serialize, Deserialize, Debug)]
pub struct Server {
    pub id: u32,
    pub name: String,

    pub ip: String,
    pub port: u16,

    pub last_favicon: Option<String>,
    pub last_status: Option<ServerStatus>,
    pub last_connected: Option<u32>,
    pub last_version: Option<String>,
}

#[derive(FromRow)]
pub struct ServerRow {
    id: i32,
    name: String,

    ip: String,
    port: i32,

    last_favicon: Option<String>,
    last_status: Option<ServerStatus>,
    last_connected: Option<i32>,
    last_version: Option<String>,
}

impl From<ServerRow> for Server {
    fn from(row: ServerRow) -> Self {
        Self {
            id: row.id as u32,
            name: row.name,
            ip: row.ip,
            port: row.port as u16,
            last_favicon: row.last_favicon,
            last_status: row.last_status,
            last_connected: row.last_connected.map(|v| v as u32),
            last_version: row.last_version.map(|v| v.to_string()),
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ServerStatus {
    Online,
    Offline,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct UnregisteredServer {
    pub name: String,
    pub ip: String,
    pub port: u16,
}