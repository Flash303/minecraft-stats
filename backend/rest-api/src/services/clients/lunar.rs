use crate::services::clients::BaseClientInfo;
use crate::state::AppState;
use log::{error, warn};
use repository::models::server::Server;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

const LUNAR_MAPPING_URL: &str = "https://servermappings.lunarclientcdn.com/servers.json";
const LUNAR_PARTNER_MAPPING_URL: &str = "https://api.lunarclientprod.com/launcher/servers?installation_id=f080e21d-ce41-4f60-803b-886157bc775a&os=win32&os_release=10.0&arch=x64&launcher_version=3.0.0";

#[derive(Serialize)]
pub struct LunarClientInfo {
    #[serde(flatten)]
    base: BaseClientInfo,
    raw: Arc<RawLunarServer>,
    raw_partner: Option<RawLunarPartnerServer>,
}

fn construct_lunar_info(state: &AppState, server: Arc<RawLunarServer>) -> LunarClientInfo {
    let srv_part = state.lunar_partner_cache.get(&server.id);
    let is_partner = srv_part
        .as_ref()
        .and_then(|info| info.partnered)
        .unwrap_or(false);

    let base = BaseClientInfo {
        partner: is_partner,
        background: server.images.background.clone(),
    };

    LunarClientInfo {
        base,
        raw: server.clone(),
        raw_partner: srv_part.map(|info| info.value().clone()),
    }
}

pub async fn get_lunar_infos(state: &AppState, current_server: &Server) -> Option<LunarClientInfo> {
    let guard = state.lunar_servers_cache.read().await;
    for server in guard.iter() {
        if server.addresses.contains(&current_server.ip)
            || server
                .primary_address
                .eq_ignore_ascii_case(current_server.ip.as_str())
        {
            return Some(construct_lunar_info(state, server.clone()));
        }
    }

    None
}

pub async fn refresh_lunar_infos(state: &AppState) {
    let response = match state.http_client.get(LUNAR_MAPPING_URL).send().await {
        Ok(response) => response,
        Err(err) => {
            error!("Could not fetch lunar infos url={LUNAR_MAPPING_URL} {err}");
            return;
        }
    };

    let status = response.status();
    let text = match response.text().await {
        Ok(text) => text,
        Err(err) => {
            error!("Could not read lunar infos body url={LUNAR_MAPPING_URL} status={status} {err}");
            return;
        }
    };
    
    let raw_values: Vec<serde_json::Value> = match serde_json::from_str(&text) {
        Ok(values) => values,
        Err(err) => {
            error!(
                "Could not parse lunar infos url={LUNAR_MAPPING_URL} status={status} body_len={} {err} snippet={:?}",
                text.len(),
                &text[..text.len().min(500)],
            );
            return;
        }
    };

    let mut servers = Vec::with_capacity(raw_values.len());
    let mut skipped = 0usize;
    for value in raw_values {
        match serde_json::from_value::<RawLunarServer>(value) {
            Ok(server) => servers.push(Arc::new(server)),
            Err(err) => {
                skipped += 1;
                warn!("Skipping invalid lunar server entry: {err}");
            }
        }
    }

    if skipped > 0 {
        warn!("Skipped {skipped} invalid lunar server entries url={URL}");
    }

    let mut guard = state.lunar_servers_cache.write().await;
    *guard = servers;
}

#[derive(Deserialize)]
struct LunarPartnerResponse {
    #[serde(default)]
    servers: Vec<serde_json::Value>,
}

pub async fn refresh_lunar_partner_infos(state: &AppState) {
    let response = match state
        .http_client
        .get(LUNAR_PARTNER_MAPPING_URL)
        .send()
        .await
    {
        Ok(response) => response,
        Err(err) => {
            error!("Could not fetch lunar partner infos url={LUNAR_PARTNER_MAPPING_URL} {err}");
            return;
        }
    };

    let status = response.status();
    let text = match response.text().await {
        Ok(text) => text,
        Err(err) => {
            error!(
                "Could not read lunar partner infos body url={LUNAR_PARTNER_MAPPING_URL} status={status} {err}"
            );
            return;
        }
    };

    let parsed: LunarPartnerResponse = match serde_json::from_str(&text) {
        Ok(parsed) => parsed,
        Err(err) => {
            error!(
                "Could not parse lunar partner infos url={LUNAR_PARTNER_MAPPING_URL} status={status} body_len={} {err} snippet={:?}",
                text.len(),
                &text[..text.len().min(500)],
            );
            return;
        }
    };

    let mut inserted = 0usize;
    let mut skipped = 0usize;
    for value in parsed.servers {
        match serde_json::from_value::<RawLunarPartnerServer>(value) {
            Ok(server) => {
                state.lunar_partner_cache.insert(server.id.clone(), server);
                inserted += 1;
            }
            Err(err) => {
                skipped += 1;
                warn!("Skipping invalid lunar partner server entry: {err}");
            }
        }
    }

    if skipped > 0 {
        warn!(
            "Skipped {skipped} invalid lunar partner server entries (inserted {inserted}) url={URL}"
        );
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
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub addresses: Vec<String>,
    #[serde(default)]
    pub primary_address: String,
    #[serde(default)]
    pub primary_color: String,
    #[serde(default)]
    pub secondary_color: String,
    #[serde(default)]
    pub minecraft_versions: Vec<String>,
    #[serde(default)]
    pub primary_minecraft_version: String,
    pub crossplay: Option<bool>,
    pub offline: Option<bool>,
    pub primary_region: Option<String>,
    pub regions: Option<Vec<String>>,
    pub primary_language: Option<String>,
    pub languages: Option<Vec<String>>,
    #[serde(default)]
    pub game_types: Vec<String>,
    #[serde(default)]
    pub primary_game_type: String,
    #[serde(default)]
    pub inactive: bool,
    #[serde(default)]
    pub enriched: bool,
    pub partnered: Option<bool>,
    pub presentation_video: Option<String>,
    pub voting_links: Option<Vec<String>>,
    pub socials: Option<Socials>,
    #[serde(default)]
    pub images: Images,
    pub modpack: Option<Modpack>,
    pub compliance: Option<Compliance>,
    pub tebex_store: Option<TebexStore>,
    #[serde(default)]
    pub localized_descriptions: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RawLunarServer {
    pub id: String,
    pub name: String,
    pub website: Option<String>,
    pub store: Option<String>,
    pub merch: Option<String>,
    pub wiki: Option<String>,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub addresses: Vec<String>,
    #[serde(default)]
    pub primary_address: String,
    #[serde(default)]
    pub primary_color: String,
    #[serde(default)]
    pub secondary_color: String,
    #[serde(default)]
    pub minecraft_versions: Vec<String>,
    #[serde(default)]
    pub primary_minecraft_version: String,
    pub crossplay: Option<bool>,
    pub offline: Option<bool>,
    pub primary_region: Option<String>,
    pub regions: Option<Vec<String>>,
    pub primary_language: Option<String>,
    pub languages: Option<Vec<String>>,
    #[serde(default)]
    pub game_types: Vec<String>,
    #[serde(default)]
    pub primary_game_type: String,
    #[serde(default)]
    pub inactive: bool,
    #[serde(default)]
    pub enriched: bool,
    pub presentation_video: Option<String>,
    pub voting_links: Option<Vec<String>>,
    pub socials: Option<Socials>,
    #[serde(default)]
    pub images: Images,
    pub modpack: Option<Modpack>,
    pub compliance: Option<Compliance>,
    pub tebex_store: Option<TebexStore>,
    #[serde(default)]
    pub localized_descriptions: HashMap<String, String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Socials {
    pub reddit: Option<String>,
    pub tiktok: Option<String>,
    pub discord: Option<String>,
    pub twitter: Option<String>,
    pub youtube: Option<String>,
    pub facebook: Option<String>,
    pub instagram: Option<String>,
    pub telegram: Option<String>,
    pub twitch: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Images {
    #[serde(default)]
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
    pub banner: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Modpack {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub provider: String,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub prompt_before_game_join: bool,
    #[serde(default)]
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
    #[serde(default)]
    pub lower_color: String,
    #[serde(default)]
    pub upper_color: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Reproduces the production failure: `drillmc` / `rainymc` entries have no
    /// `localizedDescriptions` key at all. This must parse with an empty map,
    /// not fail the whole payload.
    #[test]
    fn deserializes_server_without_localized_descriptions() {
        let json = r##"{
            "id": "drillmc",
            "name": "DrillMC",
            "description": "Gens, simulators, factory and farming all on one grinding network!",
            "addresses": ["drillmc.com"],
            "primaryAddress": "play.drillmc.com",
            "minecraftVersions": ["1.21", "1.21.1"],
            "primaryMinecraftVersion": "1.21.11",
            "primaryColor": "#4CE01B",
            "secondaryColor": "#FFFFFF",
            "primaryLanguage": "en",
            "languages": ["en"],
            "primaryRegion": "NA",
            "regions": ["NA", "EU"],
            "gameTypes": ["Tycoon"],
            "primaryGameType": "Tycoon",
            "crossplay": true,
            "socials": {"discord": "https://discord.gg/DrillNetwork"},
            "inactive": false,
            "enriched": true,
            "images": {
                "logo": "https://example.com/logo.png",
                "banner": "https://example.com/banner.png"
            }
        }"##;

        let server: RawLunarServer =
            serde_json::from_str(json).expect("server without localizedDescriptions must parse");
        assert_eq!(server.id, "drillmc");
        assert!(server.localized_descriptions.is_empty());
        assert_eq!(
            server.images.banner.as_deref(),
            Some("https://example.com/banner.png")
        );
    }

    /// New fields observed in production must be preserved instead of dropped:
    /// `banner`, `telegram`/`twitch`/`reddit` socials, `votingLinks`,
    /// `compliance`, `modpack`, `tebexStore`, `merch`, `presentationVideo`, `offline`.
    #[test]
    fn deserializes_server_with_new_fields() {
        let json = r##"{
            "id": "zyphiapvp",
            "name": "Zyphia PvP",
            "description": "The Ultimate Factions Experience",
            "addresses": ["zyphiapvp.com"],
            "primaryAddress": "zyphiapvp.com",
            "primaryColor": "#32CD32",
            "secondaryColor": "#FFFFFF",
            "minecraftVersions": ["1.21.11"],
            "primaryMinecraftVersion": "1.21.11",
            "gameTypes": ["Factions", "PvP"],
            "primaryGameType": "Factions",
            "inactive": false,
            "enriched": false,
            "offline": false,
            "merch": "https://example.com/merch",
            "presentationVideo": "lxWY1GaPK54",
            "votingLinks": ["https://example.com/vote"],
            "compliance": {"privacyPolicy": "https://example.com/privacy"},
            "modpack": {"id": "mp1", "provider": "modrinth", "required": true, "promptBeforeGameJoin": false, "promptBeforeLauncherJoin": false},
            "tebexStore": {"background": {"lowerColor": "#000", "upperColor": "#fff"}},
            "socials": {"discord": "https://discord.gg/x", "telegram": "zkraft", "twitch": "sometwitch", "reddit": "somereddit"},
            "images": {"logo": "https://example.com/logo.png", "banner": "https://example.com/banner.png"},
            "localizedDescriptions": {"it-IT": "Esperienza"}
        }"##;

        let server: RawLunarServer =
            serde_json::from_str(json).expect("server with new fields must parse");
        let socials = server.socials.expect("socials must be present");
        assert_eq!(socials.telegram.as_deref(), Some("zkraft"));
        assert_eq!(socials.twitch.as_deref(), Some("sometwitch"));
        assert_eq!(socials.reddit.as_deref(), Some("somereddit"));
        assert_eq!(
            server.images.banner.as_deref(),
            Some("https://example.com/banner.png")
        );
        assert_eq!(
            server.voting_links,
            Some(vec!["https://example.com/vote".to_string()])
        );
        assert_eq!(server.merch.as_deref(), Some("https://example.com/merch"));
        assert_eq!(server.presentation_video.as_deref(), Some("lxWY1GaPK54"));
        assert!(server.compliance.is_some());
        assert!(server.modpack.is_some());
        assert!(server.tebex_store.is_some());
        assert_eq!(
            server
                .localized_descriptions
                .get("it-IT")
                .map(String::as_str),
            Some("Esperienza")
        );
    }

    /// A single malformed entry must be skippable without losing the valid ones
    /// (this is what `refresh_lunar_infos` now does per entry).
    #[test]
    fn skips_invalid_entries_but_keeps_valid_ones() {
        let valid = serde_json::json!({
            "id": "rainymc",
            "name": "Rainy Network",
            "description": "Clans with raids",
            "addresses": ["rainymc.net"],
            "primaryAddress": "play.rainymc.net",
            "primaryColor": "#FF57A4",
            "secondaryColor": "#B4A7FF",
            "minecraftVersions": ["1.21.11"],
            "primaryMinecraftVersion": "1.21.11",
            "gameTypes": ["Factions"],
            "primaryGameType": "Factions",
            "inactive": false,
            "enriched": true,
            "images": {"logo": "https://example.com/logo.png"}
        });
        // Missing required `id`/`name`: must be rejected on its own...
        let invalid = serde_json::json!({
            "name": "Broken",
            "description": "no id",
            "addresses": [],
            "primaryAddress": "",
            "primaryColor": "",
            "secondaryColor": "",
            "minecraftVersions": [],
            "primaryMinecraftVersion": "",
            "gameTypes": [],
            "primaryGameType": "",
            "inactive": false,
            "enriched": false,
            "images": {"logo": ""}
        });
        assert!(serde_json::from_value::<RawLunarServer>(invalid.clone()).is_err());

        let payload = serde_json::Value::Array(vec![valid, invalid]);
        let mut kept = Vec::new();
        let mut skipped = 0usize;
        for value in payload.as_array().unwrap().clone() {
            match serde_json::from_value::<RawLunarServer>(value) {
                Ok(server) => kept.push(server),
                Err(_) => skipped += 1,
            }
        }
        assert_eq!(kept.len(), 1);
        assert_eq!(kept[0].id, "rainymc");
        assert_eq!(skipped, 1);
    }
}
