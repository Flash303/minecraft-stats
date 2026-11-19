use minecraft_pinger::{
    bedrock::model::BedrockPing,
    java::model::{JavaPing, Players},
};
use repository::{
    duplicate_detection::DuplicateDetectionService,
    models::server::{Server, ServerStatus},
};
use serde::Serialize;

use crate::tasks::pinger::PingerTask;

impl PingerTask {
    pub(crate) async fn apply_bedrock_ping(server: &mut Server, ping: BedrockPing) {
        server.last_status = Some(ServerStatus::Online);
        server.last_connected = Some(ping.current_players);
        server.last_max_players = Some(ping.max_players as i32);
        server.last_version = Some(ping.version);
        server.last_ping_time = Some(ping.latency);
        server.last_protocol_version = Some(ping.protocol_version as i64);

        Self::apply_motd(server, &ping.motd);
        Self::apply_favicon(server, None);
        Self::refresh_endpoint(server, ping.connected_addr.map(|a| a.to_string())).await;
    }

    pub(crate) async fn apply_java_ping(server: &mut Server, ping: JavaPing) {
        server.last_status = Some(ServerStatus::Online);
        server.last_connected = ping.players.as_ref().map(|p| p.online);
        server.last_max_players = ping.players.as_ref().map(|p| p.max);
        server.last_version = Some(ping.version.name);
        server.last_ping_time = Some(ping.latency);
        server.last_protocol_version = ping.version.protocol.map(i64::from);
        server.last_sample = Self::player_sample(&ping.players);

        Self::apply_motd(server, &ping.description);
        Self::apply_favicon(server, ping.favicon);
        Self::refresh_endpoint(server, ping.connected_addr.map(|a| a.to_string())).await;
    }

    async fn refresh_endpoint(server: &mut Server, connected_addr: Option<String>) {
        if let Some(addr) = connected_addr {
            server.resolved_endpoint = Some(addr);
        } else if server.resolved_endpoint.is_none() {
            server.resolved_endpoint =
                DuplicateDetectionService::resolve_endpoint(server.ip.as_str(), server.port).await;
        }
    }

    fn player_sample(players: &Option<Players>) -> Option<String> {
        let sample = players.as_ref()?.sample.as_ref()?;
        if sample.is_empty() {
            return None;
        }
        Some(
            sample
                .iter()
                .map(|p| p.name.as_str())
                .collect::<Vec<_>>()
                .join("\n"),
        )
    }

    fn apply_motd(server: &mut Server, motd: &impl Serialize) {
        let value = serde_json::to_value(motd).ok();
        if server.last_motd == value {
            return;
        }
        server.motd_hash = DuplicateDetectionService::hash_motd(value.as_ref());
        server.last_motd = value;
    }

    fn apply_favicon(server: &mut Server, favicon: Option<String>) {
        if server.forced_favicon || server.last_favicon == favicon {
            return;
        }
        server.favicon_hash = DuplicateDetectionService::hash_favicon(favicon.as_deref());
        server.last_favicon = favicon;
    }
}
