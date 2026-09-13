use std::collections::HashMap;
use std::sync::Arc;
use log::error;
use serde::{Deserialize, Serialize};
use repository::models::server::Server;
use crate::services::clients::BaseClientInfo;
use crate::state::AppState;

#[derive(Serialize)]
pub struct LunarClientInfo {
    #[serde(flatten)]
    base: BaseClientInfo,
    raw: Arc<RawLunarServer>
}

fn construct_lunar_info(state: &AppState, server: Arc<RawLunarServer>) -> LunarClientInfo {
    let is_partner = state.lunar_partner_cache.get(&server.id)
        .and_then(|info| info.partnered)
        .unwrap_or(false);

    let base = BaseClientInfo {
        partner: is_partner,
        background: server.images.background.clone()
    };

    LunarClientInfo {
        base,
        raw: server.clone()
    }
}

pub async fn get_lunar_infos(state: &AppState, current_server: &Server) -> Option<LunarClientInfo> {
    let guard = state.lunar_servers_cache.read().await;
    for server in guard.iter() {
        if server.addresses.contains(&current_server.ip) {
            return Some(construct_lunar_info(state, server.clone()));
        }
    }

    None
}


pub async fn refresh_lunar_infos(state: &AppState) {
    let rs = state.http_client.get("https://servermappings.lunarclientcdn.com/servers.json")
        .send()
        .await;

    if let Err(err) = rs {
        error!("Could not fetch lunar infos {err}");
        return;
    }

    let json = rs.unwrap().json::<Vec<RawLunarServer>>().await;
    if let Err(err) = json {
        error!("Could not parse lunar infos {err}");
        return;
    }

    let mut guard = state.lunar_servers_cache.write().await;
    *guard = json.unwrap().into_iter()
        .map(Arc::new)
        .collect();
}

#[derive(Deserialize)]
struct LunarPartnerResponse {
    servers: Vec<RawLunarPartnerServer>,
}

pub async fn refresh_lunar_partner_infos(state: &AppState) {
    let rs = state.http_client.get("https://api.lunarclientprod.com/launcher/servers?installation_id=f080e21d-ce41-4f60-803b-886157bc775a&os=win32&os_release=10.0&arch=x64&launcher_version=3.0.0")
        .send()
        .await;

    if let Err(err) = rs {
        error!("Could not fetch lunar infos {err}");
        return;
    }

    let json = rs.unwrap().json::<LunarPartnerResponse>().await;
    if let Err(err) = json {
        error!("Could not parse lunar infos {err}");
        return;
    }

    for server in json.unwrap().servers {
        state.lunar_partner_cache.insert(server.id.clone(), server);
    }
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLunarPartnerServer {
    pub id: String,
    pub name: String,
    pub website: Option<String>,
    pub store: Option<String>,
    pub merch: Option<String>,
    pub wiki: Option<String>,
    pub description: String,
    pub addresses: Vec<String>,
    pub primary_address: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub minecraft_versions: Vec<String>,
    pub primary_minecraft_version: String,
    pub crossplay: Option<bool>,
    pub primary_region: Option<String>,
    pub regions: Option<Vec<String>>,
    pub primary_language: Option<String>,
    pub languages: Option<Vec<String>>,
    pub game_types: Vec<String>,
    pub primary_game_type: String,
    pub inactive: bool,
    pub enriched: bool,
    pub partnered: Option<bool>,
    pub presentation_video: Option<String>,
    pub socials: Option<Socials>,
    pub images: Images,
    pub modpack: Option<Modpack>,
    pub compliance: Option<Compliance>,
    pub tebex_store: Option<TebexStore>,
    pub localized_descriptions: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLunarServer {
    pub id: String,
    pub name: String,
    pub website: Option<String>,
    pub store: Option<String>,
    pub wiki: Option<String>,
    pub description: String,
    pub addresses: Vec<String>,
    pub primary_address: String,
    pub primary_color: String,
    pub secondary_color: String,
    pub minecraft_versions: Vec<String>,
    pub primary_minecraft_version: String,
    pub crossplay: Option<bool>,
    pub offline: Option<bool>,
    pub primary_region: Option<String>,
    pub regions: Option<Vec<String>>,
    pub primary_language: Option<String>,
    pub languages: Option<Vec<String>>,
    pub game_types: Vec<String>,
    pub primary_game_type: String,
    pub inactive: bool,
    pub enriched: bool,
    pub socials: Option<Socials>,
    pub images: Images,
    pub localized_descriptions: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Socials {
    pub reddit: Option<String>,
    pub tiktok: Option<String>,
    pub discord: Option<String>,
    pub twitter: Option<String>,
    pub youtube: Option<String>,
    pub facebook: Option<String>,
    pub instagram: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Images {
    pub logo: String,
    #[serde(rename = "logo-256")]
    pub logo_256: Option<String>,
    #[serde(rename = "logo-128")]
    pub logo_128: Option<String>,
    #[serde(rename = "logo-64")]
    pub logo_64: Option<String>,
    #[serde(rename = "logo-32")]
    pub logo_32: Option<String>,
    pub wordmark: Option<String>,
    pub background: Option<String>,
    #[serde(rename = "background-720")]
    pub background_720: Option<String>,
    #[serde(rename = "background-480")]
    pub background_480: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Modpack {
    pub id: String,
    pub provider: String,
    pub required: bool,
    pub prompt_before_game_join: bool,
    pub prompt_before_launcher_join: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Compliance {
    pub rules: Option<String>,
    pub support: Option<String>,
    pub privacy_policy: Option<String>,
    pub terms_of_service: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TebexStore {
    pub background: TebexBackground,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TebexBackground {
    pub lower_color: String,
    pub upper_color: String,
}