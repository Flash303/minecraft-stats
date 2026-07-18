use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::FromRow;
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Debug)]
pub struct Server {
    pub id: u32,
    pub name: String,

    pub user_id: String,

    pub ip: String,
    pub port: u16,
    #[serde(rename = "type")]
    pub server_type: ServerType,

    pub hidden: bool,

    #[serde(with = "time::serde::timestamp")]
    pub registered_date: OffsetDateTime,

    pub last_favicon: Option<String>,
    pub last_status: Option<ServerStatus>,
    pub last_connected: Option<u32>,
    pub last_version: Option<String>,
    pub last_max_players: Option<i32>,
    pub last_motd: Option<Value>,

    #[serde(skip_serializing)]
    pub favicon_hash: Option<String>,
    #[serde(skip_serializing)]
    pub motd_hash: Option<String>,
    #[serde(skip_serializing)]
    pub resolved_endpoint: Option<String>,
}

#[derive(FromRow)]
pub struct ServerRow {
    id: i32,
    name: String,

    user_id: String,

    ip: String,
    port: i32,

    #[sqlx(rename = "type")]
    server_type: ServerType,

    hidden: bool,

    registered_date: OffsetDateTime,

    last_favicon: Option<String>,
    last_status: Option<ServerStatus>,
    last_connected: Option<i32>,
    last_version: Option<String>,
    last_max_players: Option<i32>,
    last_motd: Option<String>,

    favicon_hash: Option<String>,
    motd_hash: Option<String>,
    resolved_endpoint: Option<String>,
}

impl From<ServerRow> for Server {
    fn from(row: ServerRow) -> Self {
        Self {
            id: row.id as u32,
            name: row.name,
            user_id: row.user_id,
            ip: row.ip,
            port: row.port as u16,
            server_type: row.server_type,
            hidden: row.hidden,
            registered_date: row.registered_date,

            last_favicon: row.last_favicon,
            last_status: row.last_status,
            last_connected: row.last_connected.map(|v| v as u32),
            last_version: row.last_version.map(|v| v.to_string()),
            last_motd: row.last_motd.as_deref()
                .and_then(|s| serde_json::from_str(s).ok()),
            last_max_players: row.last_max_players,

            favicon_hash: row.favicon_hash,
            motd_hash: row.motd_hash,
            resolved_endpoint: row.resolved_endpoint,
        }
    }
}

#[derive(Serialize, Deserialize, Eq, PartialEq, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ServerStatus {
    Online,
    Offline,
}

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::Type)]
#[sqlx(type_name = "varchar")]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum ServerType {
    Java,
    Bedrock
}

#[derive(Serialize, Deserialize, Debug)]
pub struct DraftServer {
    pub name: String,
    pub ip: String,
    pub port: u16,

    #[serde(rename = "type")]
    pub server_type: ServerType,

    pub user_id: Option<String>,

    pub favicon_hash: Option<String>,
    pub motd_hash: Option<String>,
    pub resolved_endpoint: Option<String>,
}
