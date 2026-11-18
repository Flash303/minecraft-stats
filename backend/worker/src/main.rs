use crate::tasks::communication::{VerifierToSender, WorkerToVerifier};
use crate::tasks::mojang_checker::mojang_checker_worker;
use crate::tasks::pinger::ping_worker;
use crate::tasks::sender::SenderTask;
use crate::tasks::verifier::verifier_worker;
use env_logger::Env;
use log::{error, info};
use repository::postgres::PostgresRepository;
use std::env;
use std::time::Duration;
use tokio::sync::mpsc;

mod tasks;

const MAX_CONCURRENT_PING: usize = 200;
const PING_TRY_COUNT: usize = 2;
const MAX_PING_RESPONSE_TIME: Duration = Duration::from_secs(2);
pub const DELAY_BETWEEN_EACH_PING: Duration = Duration::from_secs(8);

#[tokio::main]
async fn main() {
    env_logger::Builder::from_env(Env::default().default_filter_or("info")).init();

    info!("Starting server");

    let database_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
        "postgres://anuser:password@localhost:5432/minecraft-stats".to_string()
    });

    let repository = PostgresRepository::from_url(database_url).await.unwrap();

    // ping worker -> state verifier
    let (tx_verifier, rx_verifier) = mpsc::channel::<WorkerToVerifier>(MAX_CONCURRENT_PING);

    let sender = match SenderTask::new(&repository) {
        Ok(rs) => Some(rs),
        Err(e) => {
            error!(
                "Could not create the sender task, web push notifications are disabled. Error: {}",
                e
            );
            None
        }
    };

    if let Some(sender) = sender {
        // state verifier -> notification sender
        let (tx_sender, rx_sender) = mpsc::channel::<VerifierToSender>(MAX_CONCURRENT_PING);

        // Spawn Verifier
        let repository_verifier = repository.clone();
        tokio::spawn(async move {
            verifier_worker(repository_verifier, rx_verifier, tx_sender).await;
        });

        // Spawn Sender and supervise it: a panic inside a spawned task is silent
        // unless its JoinHandle is awaited.
        let sender_handle = sender.start(rx_sender);
        tokio::spawn(async move {
            match sender_handle.await {
                Ok(()) => error!("Sender task stopped, web push notifications are disabled"),
                Err(e) => error!("Sender task crashed, web push notifications are disabled: {e}"),
            }
        });
    } else {
        // The verifier is not started: close the channel so the pinger's sends
        // fail immediately instead of blocking once the buffer is full.
        drop(rx_verifier);
    }

    // Spawn Mojang Checker
    let repository_mojang = repository.clone();
    tokio::spawn(async move {
        mojang_checker_worker(repository_mojang).await;
    });

    // Spawn Pinger
    let repository_worker = repository.clone();
    ping_worker(repository_worker, tx_verifier).await;
}
