use std::env;
use repository::postgres::PostgresRepository;
use std::time::Duration;
use tokio::sync::mpsc;
use crate::tasks::communication::WorkerToVerifier;
use crate::tasks::pinger::ping_worker;
use crate::tasks::verifier::verifier_worker;

mod tasks;

const MAX_CONCURRENT_PING: usize = 100;
const MAX_PING_RESPONSE_TIME: Duration = Duration::from_secs(1);
pub const DELAY_BETWEEN_EACH_PING: Duration = Duration::from_secs(8);

#[tokio::main]
async fn main() {
    println!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let repository = PostgresRepository::from_url(database_url).await.unwrap();

    // ping worker -> state verifier
    let (tx, rx) = mpsc::channel::<WorkerToVerifier>(MAX_CONCURRENT_PING);

    let repository_worker = repository.clone();
    tokio::spawn(async move {
        ping_worker(repository_worker, tx).await;   
    });

    tokio::spawn(async move {
        verifier_worker(rx).await;
    });
}
