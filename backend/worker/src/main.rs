use std::env;
use repository::postgres::PostgresRepository;
use std::time::Duration;
use log::info;
use tokio::sync::mpsc;
use crate::tasks::communication::{WorkerToVerifier, VerifierToSender};
use crate::tasks::pinger::ping_worker;
use crate::tasks::verifier::verifier_worker;
use crate::tasks::sender::sender_worker;

mod tasks;

const MAX_CONCURRENT_PING: usize = 100;
const MAX_PING_RESPONSE_TIME: Duration = Duration::from_secs(1);
pub const DELAY_BETWEEN_EACH_PING: Duration = Duration::from_secs(8);

#[tokio::main]
async fn main() {
    info!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let repository = PostgresRepository::from_url(database_url).await.unwrap();

    // ping worker -> state verifier
    let (tx_verifier, rx_verifier) = mpsc::channel::<WorkerToVerifier>(MAX_CONCURRENT_PING);

    // state verifier -> notification sender
    let (tx_sender, rx_sender) = mpsc::channel::<VerifierToSender>(MAX_CONCURRENT_PING);

    // Spawn Pinger
    let repository_worker = repository.clone();
    tokio::spawn(async move {
        ping_worker(repository_worker, tx_verifier).await;   
    });

    // Spawn Verifier
    let repository_verifier = repository.clone();
    tokio::spawn(async move {
        verifier_worker(repository_verifier, rx_verifier, tx_sender).await;
    });

    // Spawn Sender
    // run the sender to the main thread to keep it alive
    let repository_sender = repository.clone();
    sender_worker(repository_sender, rx_sender).await;
}
