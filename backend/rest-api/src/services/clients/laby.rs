use std::collections::HashMap;
use std::sync::Arc;
use log::error;
use crate::services::clients::BaseClientInfo;
use serde::{Deserialize, Serialize};
use regex::Regex;
use repository::models::server::Server;
use crate::state::AppState;

#[derive(Serialize)]
pub struct LabyClientInfo {
    #[serde(flatten)]
    base: BaseClientInfo,
    raw: Arc<RawLabyServer>
}

impl RawLabyServer {
    pub fn matches(&self, target_ip: &str) -> bool {
        let target = target_ip.to_lowercase();

        if self.direct_ip.to_lowercase() == target {
            return true;
        }

        for wildcard in &self.wildcards {
            let mut regex_str = wildcard.replace(".", "\\.");
            regex_str = regex_str.replace("%\\.", "(.*\\.)?").replace("*\\.", "(.*\\.)?");
            regex_str = regex_str.replace("%", ".*").replace("*", ".*");

            let final_regex = format!("(?i)^{}$", regex_str);
            if let Ok(re) = Regex::new(&final_regex) && re.is_match(&target) {
                return true;
            }
        }

        false
    }

}

fn construct_laby_info(state: &AppState, server: Arc<RawLabyServer>) -> LabyClientInfo {
    let srv_part = state.lunar_partner_cache.get(&server.direct_ip);
    let is_partner = srv_part.as_ref()
        .and_then(|info| info.partnered)
        .unwrap_or(false);

    let base = BaseClientInfo {
        partner: is_partner,
        background: server.attachments.iter()
            .filter(|a| a.file_name.eq("background.webp") || a.file_name.eq("background.webp"))
            .map(|a| a.url.clone())
            .next()
    };

    LabyClientInfo {
        base,
        raw: server.clone(),
    }
}

pub async fn get_laby_infos(state: &AppState, current_server: &Server) -> Option<LabyClientInfo> {
    let guard = state.laby_servers_cache.read().await;
    for server in guard.iter() {
        if server.matches(current_server.ip.as_str()) {
            return Some(construct_laby_info(state, server.clone()));
        }
    }

    None
}


#[derive(Deserialize)]
struct LabyServersResponses {
    server_groups: HashMap<String, RawLabyServer>,
}

pub async fn refresh_laby_infos(state: &AppState) {
    let rs = state.http_client.get("https://laby.net/api/v3/serverGroups")
        .send()
        .await;

    if let Err(err) = rs {
        error!("Could not fetch laby infos {err}");
        return;
    }

    let json = rs.unwrap().json::<LabyServersResponses>().await;
    if let Err(err) = json {
        error!("Could not parse laby infos {err}");
        return;
    }

    let mut guard = state.laby_servers_cache.write().await;
    *guard = json.unwrap().server_groups.into_values()
        .map(Arc::new)
        .collect();
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LabyPartnerResponse {
    pub servers: HashMap<String, ServerInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServerInfo {
    pub partner: bool,
}

pub async fn refresh_laby_partner_infos(state: &AppState) {
    let rs = state.http_client.get("https://laby.net/api/v3/publicServers")
        .send()
        .await;

    if let Err(err) = rs {
        error!("Could not fetch laby infos {err}");
        return;
    }

    let json = rs.unwrap().json::<LabyPartnerResponse>().await;
    if let Err(err) = json {
        error!("Could not parse laby infos {err}");
        return;
    }

    for (ip, info) in json.unwrap().servers {
        state.laby_partner_cache.insert(ip, info.partner);
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RawLabyServer {
    pub server_name: String,
    pub nice_name: String,
    pub direct_ip: String,
    #[serde(default)]
    pub wildcards: Vec<String>,
    #[serde(default)]
    pub attachments: Vec<Attachment>,
    #[serde(default)]
    pub addons: Option<Vec<Addon>>,
    pub social: Option<Social>,
    #[serde(default)]
    pub gamemodes: HashMap<String, GameMode>,
    pub user_stats: Option<String>,
    pub chat: Option<Chat>,
    pub supported_languages: Option<Vec<String>>,
    pub brand: Option<Brand>,
    pub location: Option<Location>,
    pub command_delay: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Attachment {
    pub file_name: String,
    pub url: String,
    pub hash: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Addon {
    pub uuid: String,
    pub required: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Social {
    pub web: Option<String>,
    pub web_shop: Option<String>,
    pub web_support: Option<String>,
    pub twitter: Option<String>,
    pub facebook: Option<String>,
    pub instagram: Option<String>,
    pub youtube: Option<String>,
    pub discord: Option<String>,
    pub teamspeak: Option<String>,
    pub tiktok: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GameMode {
    pub name: String,
    pub command: Option<String>,
    pub url: Option<String>,
    pub color: Option<String>,
    pub versions: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Chat {
    pub message_formats: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Brand {
    pub primary: Option<String>,
    pub background: Option<String>,
    pub text: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Location {
    pub city: Option<String>,
    pub country: String,
    pub country_code: Option<String>,
}