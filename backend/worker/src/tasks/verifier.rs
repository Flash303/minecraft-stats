use crate::tasks::communication::WorkerToVerifier;
use repository::models::server::ServerStatus::{Offline, Online};
use tokio::sync::mpsc::Receiver;

pub async fn verifier_worker(mut rx: Receiver<WorkerToVerifier>) {
    loop {
        let data = rx.recv().await;
        if data.is_none() {
            continue;
        }

        let message = data.unwrap();
        match message {
            WorkerToVerifier::ServerStatusUpdated(state) => {
                let status_changed = state.new_status != state.old_status.unwrap_or(Offline);
                let player_number_changer = state.new_status == Online &&
                    state.old_players.unwrap_or(0) != state.new_players.unwrap_or(0);

                todo!("finish")
            }
        }
    }
}