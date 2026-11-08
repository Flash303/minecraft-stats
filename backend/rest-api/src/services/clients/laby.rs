use crate::services::clients::BaseClientInfo;
use crate::state::AppState;
use futures::stream::{self, StreamExt};
use log::error;
use regex::Regex;
use repository::models::server::Server;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::Duration;

#[derive(Serialize)]
pub struct LabyClientInfo {
    #[serde(flatten)]
    base: BaseClientInfo,
    raw: Arc<RawLabyServer>,
    #[serde(skip_serializing_if = "Option::is_none")]
    yt_trailer: Option<String>,
}

impl RawLabyServer {
    pub fn matches(&self, target_ip: &str) -> bool {
        let target = target_ip.to_lowercase();

        if self.direct_ip.to_lowercase() == target {
            return true;
        }

        for re in &self.compiled_regexes {
            if re.is_match(&target) {
                return true;
            }
        }

        false
    }
}

async fn construct_laby_info(state: &AppState, server: Arc<RawLabyServer>) -> LabyClientInfo {
    let srv_part = state.laby_partner_cache.get(&server.direct_ip);
    let is_partner = srv_part.map(|t| *t.value()).unwrap_or(false);

    let base = BaseClientInfo {
        partner: is_partner,
        background: server
            .attachments
            .iter()
            .filter(|a| a.file_name.eq("background.webp") || a.file_name.eq("background.webp"))
            .map(|a| a.url.clone())
            .next(),
    };

    let yt_trailer = match manifest_url(&server) {
        Some(url) if is_allowed_manifest_url(url) => state
            .laby_manifest_cache
            .get(&url.to_string())
            .await
            .flatten(),
        _ => None,
    };

    LabyClientInfo {
        base,
        raw: server.clone(),
        yt_trailer,
    }
}

pub async fn get_laby_infos(state: &AppState, current_server: &Server) -> Option<LabyClientInfo> {
    let guard = state.laby_servers_cache.read().await;
    for server in guard.iter() {
        if server.matches(current_server.ip.as_str()) {
            return Some(construct_laby_info(state, server.clone()).await);
        }
    }

    None
}

#[derive(Deserialize)]
struct LabyServersResponses {
    server_groups: HashMap<String, RawLabyServer>,
}

pub async fn refresh_laby_infos(state: &AppState) {
    let rs = state
        .http_client
        .get("https://laby.net/api/v3/serverGroups")
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
    *guard = json
        .unwrap()
        .server_groups
        .into_values()
        .map(|mut server| {
            for wildcard in &server.wildcards {
                let mut regex_str = wildcard.replace(".", "\\.");
                regex_str = regex_str
                    .replace("%\\.", "(.*\\.)?")
                    .replace("*\\.", "(.*\\.)?");
                regex_str = regex_str.replace("%", ".*").replace("*", ".*");

                let final_regex = format!("(?i)^{}$", regex_str);
                if let Ok(re) = Regex::new(&final_regex) {
                    server.compiled_regexes.push(re);
                }
            }
            Arc::new(server)
        })
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
    let rs = state
        .http_client
        .get("https://laby.net/api/v3/publicServers")
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
    #[serde(skip, default)]
    pub compiled_regexes: Vec<Regex>,
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

const MANIFEST_CACHE_TTL: Duration = Duration::from_hours(24);
const ALLOWED_MANIFEST_ORIGINS: [&str; 2] = ["https://dl.labymod.net", "https://resource.laby.net"];

fn manifest_url(server: &RawLabyServer) -> Option<&str> {
    server
        .attachments
        .iter()
        .find(|a| a.file_name == "manifest.json")
        .map(|a| a.url.as_str())
}

fn is_allowed_manifest_url(url: &str) -> bool {
    let parsed = match reqwest::Url::parse(url) {
        Ok(parsed) => parsed,
        Err(_) => return false,
    };
    if parsed.scheme() != "https" || !parsed.username().is_empty() || parsed.password().is_some() {
        return false;
    }
    ALLOWED_MANIFEST_ORIGINS
        .iter()
        .any(|origin| parsed.origin().ascii_serialization() == *origin)
}

#[derive(Deserialize)]
struct RawLabyManifest {
    #[serde(default)]
    yt_trailer: Option<String>,
}

fn normalize_trailer(value: Option<String>) -> Option<String> {
    value.filter(|trailer| !trailer.trim().is_empty())
}

async fn fetch_manifest_trailer(state: &AppState, url: &str) -> Option<Option<String>> {
    let response = match state.http_client.get(url).send().await {
        Ok(response) => response,
        Err(err) => {
            error!("Could not fetch laby manifest url={url} {err}");
            return None;
        }
    };
    if !response.status().is_success() {
        error!(
            "Could not fetch laby manifest url={url} status={}",
            response.status()
        );
        return None;
    }
    match response.json::<RawLabyManifest>().await {
        Ok(manifest) => Some(normalize_trailer(manifest.yt_trailer)),
        Err(err) => {
            error!("Could not parse laby manifest url={url} {err}");
            None
        }
    }
}

pub async fn refresh_laby_manifests(state: &AppState) {
    let urls: HashSet<String> = {
        let guard = state.laby_servers_cache.read().await;
        guard
            .iter()
            .filter_map(|server| manifest_url(server))
            .filter(|url| is_allowed_manifest_url(url))
            .map(str::to_string)
            .collect()
    };

    stream::iter(urls)
        .for_each_concurrent(8, |url| async {
            if state.laby_manifest_cache.get(&url).await.is_some() {
                return;
            }
            // Failures stay uncached so the next cycle retries them.
            if let Some(trailer) = fetch_manifest_trailer(state, &url).await {
                state
                    .laby_manifest_cache
                    .insert(url, trailer, MANIFEST_CACHE_TTL)
                    .await;
            }
        })
        .await;
}

#[cfg(test)]
mod tests {
    use super::*;

    fn server_with_attachments(attachments: Vec<Attachment>) -> RawLabyServer {
        RawLabyServer {
            server_name: String::new(),
            nice_name: String::new(),
            direct_ip: String::new(),
            wildcards: Vec::new(),
            compiled_regexes: Vec::new(),
            attachments,
            addons: None,
            social: None,
            gamemodes: HashMap::new(),
            user_stats: None,
            chat: None,
            supported_languages: None,
            brand: None,
            location: None,
            command_delay: None,
        }
    }

    fn attachment(file_name: &str, url: &str) -> Attachment {
        Attachment {
            file_name: file_name.to_string(),
            url: url.to_string(),
            hash: String::new(),
        }
    }

    #[test]
    fn manifest_url_finds_manifest_attachment() {
        let server = server_with_attachments(vec![
            attachment("background.webp", "https://dl.labymod.net/bg.webp"),
            attachment("manifest.json", "https://dl.labymod.net/manifest.json"),
        ]);
        assert_eq!(
            manifest_url(&server),
            Some("https://dl.labymod.net/manifest.json")
        );
    }

    #[test]
    fn manifest_url_returns_none_without_manifest() {
        let server = server_with_attachments(vec![attachment(
            "background.webp",
            "https://dl.labymod.net/bg.webp",
        )]);
        assert_eq!(manifest_url(&server), None);
    }

    #[test]
    fn only_allowlists_laby_cdn_manifest_urls() {
        assert!(is_allowed_manifest_url(
            "https://dl.labymod.net/manifest.json"
        ));
        assert!(is_allowed_manifest_url(
            "https://resource.laby.net/abc/manifest.json"
        ));
        assert!(!is_allowed_manifest_url(
            "http://dl.labymod.net/manifest.json"
        ));
        assert!(!is_allowed_manifest_url(
            "https://dl.labymod.net.evil.com/manifest.json"
        ));
        assert!(!is_allowed_manifest_url(
            "https://evil.com/https://dl.labymod.net/manifest.json"
        ));
        assert!(!is_allowed_manifest_url(
            "https://dl.labymod.net@evil.com/manifest.json"
        ));
        assert!(!is_allowed_manifest_url("not a url"));
    }

    #[test]
    fn parses_manifest_trailer() {
        let manifest: RawLabyManifest =
            serde_json::from_str(r#"{"yt_trailer": "dQw4w9WgXcQ"}"#).unwrap();
        assert_eq!(
            normalize_trailer(manifest.yt_trailer),
            Some("dQw4w9WgXcQ".to_string())
        );

        let manifest: RawLabyManifest = serde_json::from_str(r#"{}"#).unwrap();
        assert_eq!(normalize_trailer(manifest.yt_trailer), None);

        assert_eq!(normalize_trailer(Some("   ".to_string())), None);
    }
}
