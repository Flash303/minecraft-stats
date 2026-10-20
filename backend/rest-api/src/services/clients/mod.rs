use crate::services::clients::laby::{LabyClientInfo, get_laby_infos};
use crate::services::clients::lunar::{LunarClientInfo, get_lunar_infos};
use crate::state::AppState;
use repository::models::server::Server;
use serde::Serialize;

pub mod laby;
pub mod lunar;

#[derive(Serialize)]
pub struct ClientInfos {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lunar: Option<LunarClientInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub laby: Option<LabyClientInfo>,
}

#[derive(Serialize)]
pub struct BaseClientInfo {
    pub partner: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
}

pub async fn get_client_infos(state: &AppState, server: &Server) -> ClientInfos {
    ClientInfos {
        laby: get_laby_infos(state, server).await,
        lunar: get_lunar_infos(state, server).await,
    }
}
