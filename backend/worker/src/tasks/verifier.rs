use crate::tasks::communication::{WorkerToVerifier, VerifierToSender, TriggeredAlertNotification};
use repository::models::server::ServerStatus::{Offline, Online};
use repository::models::alert::AlertType;
use repository::postgres::PostgresRepository;
use repository::repository::Repository;
use tokio::sync::mpsc::{Receiver, Sender};

pub async fn verifier_worker(
    repository: PostgresRepository,
    mut rx: Receiver<WorkerToVerifier>,
    tx_sender: Sender<VerifierToSender>,
) {
    println!("Verifier task started");

    while let Some(message) = rx.recv().await {
        match message {
            WorkerToVerifier::ServerStatusUpdated(state) => {
                let status_changed = state.new_status != state.old_status.clone().unwrap_or(Offline);
                let player_number_changer = state.new_status == Online &&
                    state.old_players.unwrap_or(0) != state.new_players.unwrap_or(0);

                // If nothing relevant changed, skip alert evaluation
                if !status_changed && !player_number_changer {
                    continue;
                }
                
                // Query active alerts for this server
                let active_alerts_result = repository.get_active_alerts_for_servers(&[state.id]).await;
                let active_alerts = match active_alerts_result {
                    Ok(alerts) => alerts,
                    Err(e) => {
                        println!("Verifier error fetching alerts for server {}: {:?}", state.id, e);
                        continue;
                    }
                };

                for alert in active_alerts {
                    let mut is_triggered = false;

                    match alert.alert_type {
                        AlertType::StatusToOffline => {
                            is_triggered = state.old_status == Some(Online) && state.new_status == Offline;
                        }
                        AlertType::StatusToOnline => {
                            is_triggered = state.old_status == Some(Offline) && state.new_status == Online;
                        }
                        AlertType::PlayerAbove => {
                            if state.new_status == Online {
                                let threshold = alert.player_threshold.unwrap_or(0);
                                is_triggered = (state.new_players.unwrap_or(0) as i32) > threshold
                                    && (state.old_players.unwrap_or(0) as i32) <= threshold;
                            }
                        }
                        AlertType::PlayerBelow => {
                            if state.new_status == Online {
                                let threshold = alert.player_threshold.unwrap_or(0);
                                is_triggered = (state.new_players.unwrap_or(0) as i32) < threshold
                                    && (state.old_players.unwrap_or(0) as i32) >= threshold;
                            }
                        }
                    }

                    if is_triggered {
                        let notification = TriggeredAlertNotification {
                            alert,
                            server_name: state.name.clone(),

                            old_status: state.old_status.clone(),
                            old_players: state.old_players,

                            new_status: state.new_status.clone(),
                            new_players: state.new_players,
                        };

                        if let Err(e) = tx_sender.send(VerifierToSender::TriggerNotification(notification)).await {
                            println!("Verifier error sending notification to Sender channel: {:?}", e);
                        }
                    }
                }
            }
        }
    }
}