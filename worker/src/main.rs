use pinger::ping_server;
use repository::models::record::Record;
use repository::repository::{PostgresRepository, Repository};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::time::{Duration, Instant};
use time::OffsetDateTime;
use tokio::task::JoinHandle;
use tokio::time::sleep;
use repository::models::server::ServerStatus;

#[tokio::main]
async fn main() {
    println!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await
        .map_err(|e| e.to_string())
        .unwrap();
    println!("Connexion réussie à PostgreSQL !");

    let repository = PostgresRepository::new(pool);
    repository.initialize()
        .await
        .map_err(|e| e.to_string())
        .unwrap();
    println!("Initialized successfully!");

    loop {
        let count_time = Instant::now();
        println!("Pinging...");

        let possible_servers = repository.list_servers().await;
        if let Ok(servers) = possible_servers {
            let mut tasks: Vec<JoinHandle<Option<Record>>> = Vec::new();

            for mut server in servers {
                let task_repository = repository.clone();
                let task = tokio::spawn(async move {
                    for i in 0..3 {
                        let ping_rs = ping_server(server.ip.as_str(), server.port).await;
                        if let Ok(ping) = ping_rs {
                            server.last_favicon = ping.favicon;
                            server.last_status = Some(ServerStatus::Online);
                            server.last_connected = Some(ping.players.online);
                            task_repository.update_server(&server).await.unwrap();

                            return Some(Record {
                                server_id: server.id,
                                date: OffsetDateTime::now_utc(),
                                value: ping.players.online,
                            })
                        } else if i == 2 {
                            println!("Error in ping the server {} : {:?}", server.name, ping_rs.err());
                            server.last_status = Some(ServerStatus::Offline);
                            server.last_connected = None;
                            task_repository.update_server(&server).await.unwrap();
                        }
                    }

                    return None;
                });

                tasks.push(task);
            }

            let mut records: Vec<Record> = Vec::new();
            for task in tasks {
                let data = task.await.unwrap();
                if let Some(record) = data {
                    records.push(record);
                }
            }

            repository.save_pings(&records).await.unwrap();
        } else {
            println!("Failed to retrieve possible servers: {:?}", possible_servers.err());
        }

        println!("Ping duration : {:?}ms", count_time.elapsed().as_millis());

        sleep(Duration::from_secs(10)).await;
    }
}