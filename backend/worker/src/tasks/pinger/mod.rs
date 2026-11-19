use std::sync::Arc;

use crate::{
    DELAY_BETWEEN_EACH_PING, MAX_CONCURRENT_PING, MAX_PING_RESPONSE_TIME, PING_TRY_COUNT,
    tasks::communication::{ServerStateChange, WorkerToVerifier},
};
use futures::{StreamExt, stream};
use log::{debug, error, info, warn};
use minecraft_pinger::{MinecraftPinger, config::PingConfig, java::config::JavaPingConfig};
use repository::models::server::ServerStatusUpdate;
use repository::repository::Repository;
use repository::{
    models::{
        record::Record,
        server::{Server, ServerStatus, ServerType},
    },
    postgres::PostgresRepository,
};
use time::OffsetDateTime;
use tokio::{
    sync::mpsc::Sender,
    time::{Instant, MissedTickBehavior},
};

pub mod apply;

pub struct PingerTask {
    repository: PostgresRepository,
    pinger: MinecraftPinger,
    config: Arc<PingConfig>,
    java_config: Arc<JavaPingConfig>,
}

impl PingerTask {
    pub fn new(repository: &PostgresRepository) -> Result<Self, String> {
        let pinger = MinecraftPinger::new()
            .map_err(|e| format!("Failed to create minecraft ping client: {}", e))?;

        let config = PingConfig::builder()
            .set_timeout(MAX_PING_RESPONSE_TIME)
            .deny_non_public_ips()
            .build();

        let java_config = JavaPingConfig::from(&config).build();

        Ok(Self {
            repository: repository.clone(),
            pinger,
            config: Arc::new(config),
            java_config: Arc::new(java_config),
        })
    }

    pub async fn run(self, state_updater: Sender<WorkerToVerifier>) {
        let mut ticker = tokio::time::interval(DELAY_BETWEEN_EACH_PING);
        ticker.set_missed_tick_behavior(MissedTickBehavior::Delay);

        loop {
            ticker.tick().await;
            if let Err(e) = self.ping_round(&state_updater).await {
                warn!("Ping round failed: {e}");
            }
        }
    }

    pub async fn ping_round(&self, state_updater: &Sender<WorkerToVerifier>) -> Result<(), String> {
        let start_time = Instant::now();

        let mut servers = self
            .repository
            .list_servers()
            .await
            .map_err(|e| e.to_string())?;

        info!("Pinging {} servers", servers.len());

        servers.sort_by_key(|server| match &server.last_status {
            Some(ServerStatus::Offline) => 0,
            None => 1,
            Some(ServerStatus::Online) => 2,
        });

        let (updated, records): (Vec<Server>, Vec<Option<Record>>) = stream::iter(servers)
            .map(move |server| async move { self.ping_server(server, state_updater).await })
            .buffer_unordered(MAX_CONCURRENT_PING)
            .unzip()
            .await;

        let records: Vec<Record> = records.into_iter().flatten().collect();

        let updates: Vec<ServerStatusUpdate> =
            updated.into_iter().map(ServerStatusUpdate::from).collect();
        if let Err(e) = self.repository.update_servers_status(&updates).await {
            error!("Could not save server statuses: {e:?}");
        }
        if let Err(e) = self.repository.save_pings(&records).await {
            error!("Could not save ping records: {e:?}");
        }

        info!(
            "Ping round finished in {}ms",
            start_time.elapsed().as_millis()
        );
        Ok(())
    }

    async fn ping_server(
        &self,
        mut server: Server,
        state_updater: &Sender<WorkerToVerifier>,
    ) -> (Server, Option<Record>) {
        let mut state = ServerStateChange::from(&server);

        let mut last_error = String::new();
        let mut record = None;

        for _ in 0..PING_TRY_COUNT {
            match self.ping_once(&mut server).await {
                Ok(online_players) => {
                    record = Some(Record {
                        server_id: server.id,
                        date: OffsetDateTime::now_utc(),
                        value: online_players,
                    });
                    break;
                }
                Err(e) => last_error = e,
            }
        }

        if record.is_none() {
            warn!(
                "Server {} (id {}) did not answer after {PING_TRY_COUNT} attempts: {last_error}",
                server.name, server.id
            );
            server.last_status = Some(ServerStatus::Offline);
            server.last_connected = None;
            server.last_sample = None;
        }

        state.edit_new_status(&server);
        if state_updater
            .send(WorkerToVerifier::ServerStatusUpdated(state))
            .await
            .is_err()
        {
            debug!("Verifier channel closed, dropping status update");
        }

        (server, record)
    }

    async fn ping_once(&self, server: &mut Server) -> Result<i32, String> {
        match server.server_type {
            ServerType::Java => {
                let ping = self
                    .pinger
                    .ping_java_server(server.ip.as_str(), server.port, &self.java_config)
                    .await
                    .map_err(|e| e.to_string())?;
                let online = ping.players.as_ref().map_or(0, |p| p.online);
                Self::apply_java_ping(server, ping).await;
                Ok(online)
            }
            ServerType::Bedrock => {
                let ping = self
                    .pinger
                    .ping_bedrock_server(server.ip.as_str(), server.port, &self.config)
                    .await
                    .map_err(|e| e.to_string())?;
                let online = ping.current_players;
                Self::apply_bedrock_ping(server, ping).await;
                Ok(online)
            }
        }
    }
}
