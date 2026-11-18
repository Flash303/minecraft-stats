use crate::tasks::communication::{VerifierToSender, WorkerToVerifier};
use crate::tasks::mojang_checker::mojang_checker_worker;
use crate::tasks::pinger::PingerTask;
use crate::tasks::sender::SenderTask;
use crate::tasks::verifier::verifier_worker;
use env_logger::Env;
use log::{error, info};
use repository::postgres::PostgresRepository;
use std::env;
use std::time::Duration;
use tokio::sync::mpsc;
use tokio::task::JoinSet;

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

    let repository = match PostgresRepository::from_url(database_url).await {
        Ok(r) => r,
        Err(e) => {
            error!("Could not apply migrations error: {e}");
            return;
        },
    };

    let pinger = match PingerTask::new(&repository) {
        Ok(task) => task,
        Err(e) => {
            error!("Cannot create the pinger task, error: {e}");
            return;
        }
    };

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

    let mut tasks = JoinSet::new();
    tasks.spawn(pinger.run(tx_verifier));
    tasks.spawn(mojang_checker_worker(repository.clone()));

    if let Some(sender) = sender {
        // state verifier -> notification sender
        let (tx_sender, rx_sender) = mpsc::channel::<VerifierToSender>(MAX_CONCURRENT_PING);

        // Spawn Verifier
        tasks.spawn(verifier_worker(repository.clone(), rx_verifier, tx_sender));
        tasks.spawn(sender.run(rx_sender));
    } else {
        drop(rx_verifier);
    }

    if let Some(result) = tasks.join_next().await {
        match result {
            Ok(()) => error!("A worker stopped unexpectedly"),
            Err(e) => error!("A worker crashed: {e}"),
        }
        std::process::exit(1);
    }
}
