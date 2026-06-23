use crate::tasks::communication::{ServerStateChange, WorkerToVerifier};
use crate::{DELAY_BETWEEN_EACH_PING, MAX_CONCURRENT_PING, MAX_PING_RESPONSE_TIME};
use futures::{stream, StreamExt};
use minecraft_pinger::config::PingConfig;
use minecraft_pinger::models::bedrock_model::BedrockPing;
use minecraft_pinger::models::java_model::JavaPing;
use minecraft_pinger::utils::version_parser::parse_minecraft_version_range;
use minecraft_pinger::MinecraftPinger;
use repository::duplicate_detection::DuplicateDetectionService;
use repository::models::record::Record;
use repository::models::server::{Server, ServerStatus, ServerType};
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use std::sync::Arc;
use std::time::Instant;
use time::OffsetDateTime;
use tokio::sync::mpsc::Sender;
use tokio::time::sleep;

enum PingResultType {
    Java(JavaPing),
    Bedrock(BedrockPing)
}

async fn update_server_from_ping(server: &mut Server, ping: PingResultType) {
    match ping {
        PingResultType::Java(ping) => {
            server.last_favicon = ping.favicon.clone();
            server.last_status = Some(ServerStatus::Online);
            server.last_connected = Some(ping.players.online);
            server.last_version = parse_minecraft_version_range(&ping.version.name)
                .map(|(first, last)| format!("{} - {}", first, last))
                .or(None);

            // Update fingerprints
            server.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
            let motd_value = serde_json::to_value(&ping.description).ok();
            server.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
            server.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(server.ip.as_str(), server.port).await;
        }
        PingResultType::Bedrock(ping) => {
            server.last_favicon = None;
            server.last_status = Some(ServerStatus::Online);
            server.last_connected = Some(ping.current_players);
            server.last_version = Some(ping.version.clone());

            // Update fingerprints
            server.favicon_hash = None;
            let motd_value = serde_json::to_value(&ping.motd).ok();
            server.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
            server.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(server.ip.as_str(), server.port).await;
        }
    }
}

pub async fn ping_worker(repository: PostgresRepository, state_updater: Sender<WorkerToVerifier>) {
    let result = MinecraftPinger::new();
    if let Err(error) = result {
        println!("Failed to create minecraft ping client: {}", error);
        return;
    }

    let pinger = Arc::new(result.unwrap());
    let pinger_config = Arc::new(PingConfig::builder().set_timeout(MAX_PING_RESPONSE_TIME).build());

    loop {
        let possible_servers = repository.list_servers().await;
        let count_time = Instant::now();
        println!("Pinging...");

        if let Ok(servers) = possible_servers {
            let mut optimised_tasks = stream::iter(servers)
                .map(|mut server| {
                    let task_repository = repository.clone();
                    let pinger = pinger.clone();
                    let pinger_config = pinger_config.clone();
                    let state_updater = state_updater.clone();

                    async move {
                        let mut state = ServerStateChange::from(&server);

                        for i in 0..3 {
                            let mut is_ok = false;
                            let mut players_online = 0;
                            let mut err_msg = None;

                            match server.server_type {
                                ServerType::Java => {
                                    let ping_rs = pinger.ping_java_server(server.ip.as_str(), server.port, pinger_config.as_ref()).await;
                                    match ping_rs {
                                        Ok(ping) => {
                                            players_online = ping.players.online;

                                            update_server_from_ping(&mut server, PingResultType::Java(ping)).await;

                                            is_ok = true;
                                        },
                                        Err(e) => {
                                            err_msg = Some(format!("{:?}", e));
                                        }
                                    }
                                },
                                ServerType::Bedrock => {
                                    let ping_rs = pinger.ping_bedrock_server(server.ip.as_str(), server.port, pinger_config.as_ref()).await;
                                    match ping_rs {
                                        Ok(ping) => {
                                            players_online = ping.current_players;

                                            update_server_from_ping(&mut server, PingResultType::Bedrock(ping)).await;

                                            is_ok = true;
                                        },
                                        Err(e) => {
                                            err_msg = Some(format!("{:?}", e));
                                        }
                                    }
                                }
                            }

                            if is_ok {
                                // Send the server update to the other thread
                                state.edit_new_status(&server);
                                let _ = state_updater.send(WorkerToVerifier::ServerStatusUpdated(state)).await;

                                task_repository.update_server(&server).await.unwrap();

                                let record = Record {
                                    server_id: server.id,
                                    date: OffsetDateTime::now_utc(),
                                    value: players_online,
                                };

                                return (server, Some(record));
                            } else if i == 2 {
                                println!("Error in ping the server {} : {:?}", server.name, err_msg);
                                server.last_status = Some(ServerStatus::Offline);
                                server.last_connected = None;

                                // Send offline state
                                state.edit_new_status(&server);
                                let _ = state_updater.send(WorkerToVerifier::ServerStatusUpdated(state.clone())).await;

                                task_repository.update_server(&server).await.unwrap();
                            }
                        }

                        return (server, None);
                    }
                })
                .buffer_unordered(MAX_CONCURRENT_PING);

            let mut updated_servers = Vec::new();
            let mut records = Vec::new();

            while let Some((server, record)) = optimised_tasks.next().await {
                updated_servers.push(server);

                if let Some(rec) = record {
                    records.push(rec);
                }
            }

            if let Err(e) = repository.update_servers(&updated_servers).await {
                println!("Error on server saving: {:?}", e);
            }

            if let Err(e) = repository.save_pings(&records).await {
                println!("Error on ping saving: {:?}", e);
            }
        } else {
            println!("Failed to retrieve possible servers: {:?}", possible_servers.err());
        }

        println!("Ping duration : {:?}ms", count_time.elapsed().as_millis());

        sleep(DELAY_BETWEEN_EACH_PING).await;
    }
}