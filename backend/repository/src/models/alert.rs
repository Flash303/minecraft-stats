use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use time::OffsetDateTime;

#[derive(Serialize, Deserialize, Debug, Clone, sqlx::Type, PartialEq, Eq)]
#[sqlx(type_name = "text")]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum AlertType {
    StatusToOffline,
    StatusToOnline,
    PlayerAbove,
    PlayerBelow,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Alert {
    pub id: u32,
    pub user_id: String,
    pub server_id: u32,
    
    pub alert_type: AlertType,
    pub player_threshold: Option<i32>,
    pub is_active: bool,
    
    pub created_at: OffsetDateTime,
}

#[derive(FromRow)]
pub struct AlertRow {
    pub id: i32,
    pub user_id: String,
    pub server_id: i32,
    
    pub alert_type: AlertType,
    pub player_threshold: Option<i32>,
    pub is_active: bool,
    
    pub created_at: OffsetDateTime,
}

impl From<AlertRow> for Alert {
    fn from(row: AlertRow) -> Self {
        Self {
            id: row.id as u32,
            user_id: row.user_id,
            server_id: row.server_id as u32,
            alert_type: row.alert_type,
            player_threshold: row.player_threshold,
            is_active: row.is_active,
            created_at: row.created_at,
        }
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DraftAlert {
    pub user_id: String,
    pub server_id: u32,
    
    pub alert_type: AlertType,
    pub player_threshold: Option<i32>,
    pub is_active: bool,
}
