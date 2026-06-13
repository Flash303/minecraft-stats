use futures::{StreamExt, stream};
use repository::models::record::Record;
use repository::models::server::ServerStatus;
use std::env;
use std::sync::Arc;
use std::time::{Duration, Instant};
use minecraft_pinger::{MinecraftPinger, PingConfig};
use minecraft_pinger::utils::version_parser::parse_minecraft_version_range;
use time::{OffsetDateTime};
use tokio::time::{sleep};
use repository::duplicate_detection::DuplicateDetectionService;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;

const MAX_CONCURENT_PING: usize = 100;
const MAX_PING_RESPONSE_TIME: Duration = Duration::from_secs(1);

#[tokio::main]
async fn main() {
    println!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let repository = PostgresRepository::from_url(database_url).await.unwrap();

    let result = MinecraftPinger::new();
    if let Err(error) = result {
        println!("Failed to create minecraft ping client: {}", error);
        return;
    }

    let pinger = Arc::new(result.unwrap());
    let pinger_config = Arc::new(PingConfig {
        timeout: MAX_PING_RESPONSE_TIME,
        ..Default::default()
    });

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

                    async move {
                        for i in 0..3 {
                            let ping_rs = pinger.ping_server(server.ip.as_str(), server.port, pinger_config.as_ref()).await;
                            if let Ok(ping) = ping_rs {
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

                                task_repository.update_server(&server).await.unwrap();

                                let record = Record {
                                    server_id: server.id,
                                    date: OffsetDateTime::now_utc(),
                                    value: ping.players.online,
                                };

                                return (server, Some(record));
                            } else {
                                if i == 2 {
                                    println!("Error in ping the server {} : {:?}", server.name, ping_rs.err());
                                    server.last_status = Some(ServerStatus::Offline);
                                    server.last_connected = None;
                                    task_repository.update_server(&server).await.unwrap();
                                } else {
                                    sleep(Duration::from_millis(80)).await; // wait a litle bit before retry to ping
                                }
                            }
                        }

                        return (server, None);
                    }
                })
                .buffer_unordered(MAX_CONCURENT_PING);

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

        sleep(Duration::from_secs(8)).await;
    }
}
