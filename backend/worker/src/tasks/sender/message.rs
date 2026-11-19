use repository::models::alert::AlertType;
use serde_json::json;

use crate::tasks::{communication::TriggeredAlertNotification, sender::SenderTask};

impl SenderTask {
    pub(super) fn create_notification_payload(notification: &TriggeredAlertNotification) -> String {
        json!({
            "title": Self::create_message_title(notification),
            "body": Self::create_message_body(notification),

            "alertType": Self::alert_type_key(notification),

            "serverName": notification.server_name,
            "threshold": notification.alert.player_threshold.unwrap_or(0),
            "current": notification.new_players.unwrap_or(0),

            "icon": notification.get_logo(),
            "url": format!("/server/{}", notification.alert.server_id)
        })
        .to_string()
    }

    fn create_message_title(notification: &TriggeredAlertNotification) -> String {
        format!("Alerte Serveur: {}", notification.server_name)
    }

    fn alert_type_key(notification: &TriggeredAlertNotification) -> &str {
        match notification.alert.alert_type {
            AlertType::StatusToOffline => "status_to_offline",
            AlertType::StatusToOnline => "status_to_online",
            AlertType::PlayerAbove => "player_above",
            AlertType::PlayerBelow => "player_below",
        }
    }

    fn create_message_body(notification: &TriggeredAlertNotification) -> String {
        match notification.alert.alert_type {
            AlertType::StatusToOffline => format!(
                "Le serveur {} vient de passer HORS-LIGNE !",
                notification.server_name
            ),
            AlertType::StatusToOnline => format!(
                "Le serveur {} est de nouveau EN LIGNE !",
                notification.server_name
            ),
            AlertType::PlayerAbove => {
                let current = notification.new_players.unwrap_or(0);
                let threshold = notification.alert.player_threshold.unwrap_or(0);
                format!(
                    "Le nombre de joueurs sur {} a dépassé {} (Actuel : {}) !",
                    notification.server_name, threshold, current
                )
            }
            AlertType::PlayerBelow => {
                let current = notification.new_players.unwrap_or(0);
                let threshold = notification.alert.player_threshold.unwrap_or(0);
                format!(
                    "Le nombre de joueurs sur {} est descendu en-dessous de {} (Actuel : {}) !",
                    notification.server_name, threshold, current
                )
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use repository::models::alert::Alert;
    use repository::models::server::ServerStatus;
    use serde_json::Value;
    use time::OffsetDateTime;

    fn notification(
        alert_type: AlertType,
        player_threshold: Option<u32>,
        new_players: Option<i32>,
    ) -> TriggeredAlertNotification {
        TriggeredAlertNotification {
            alert: Alert {
                id: 1,
                user_id: "user_1".to_string(),
                server_id: 42,
                alert_type,
                player_threshold,
                is_active: true,
                created_at: OffsetDateTime::now_utc(),
            },
            server_name: "Mon Serveur".to_string(),
            _old_status: Some(ServerStatus::Online),
            _old_players: Some(0),
            _new_status: ServerStatus::Offline,
            new_players,
        }
    }

    #[test]
    fn formats_title() {
        assert_eq!(
            SenderTask::create_message_title(&notification(AlertType::StatusToOffline, None, None)),
            "Alerte Serveur: Mon Serveur"
        );
    }

    #[test]
    fn formats_status_messages() {
        assert_eq!(
            SenderTask::create_message_body(&notification(AlertType::StatusToOffline, None, None)),
            "Le serveur Mon Serveur vient de passer HORS-LIGNE !"
        );
        assert_eq!(
            SenderTask::create_message_body(&notification(AlertType::StatusToOnline, None, None)),
            "Le serveur Mon Serveur est de nouveau EN LIGNE !"
        );
    }

    #[test]
    fn formats_player_messages() {
        assert_eq!(
            SenderTask::create_message_body(&notification(
                AlertType::PlayerAbove,
                Some(10),
                Some(15)
            )),
            "Le nombre de joueurs sur Mon Serveur a dépassé 10 (Actuel : 15) !"
        );
        assert_eq!(
            SenderTask::create_message_body(&notification(
                AlertType::PlayerBelow,
                Some(10),
                Some(3)
            )),
            "Le nombre de joueurs sur Mon Serveur est descendu en-dessous de 10 (Actuel : 3) !"
        );
    }

    #[test]
    fn formats_missing_values_as_zero() {
        let notification = notification(AlertType::PlayerAbove, None, None);
        assert_eq!(
            SenderTask::create_message_body(&notification),
            "Le nombre de joueurs sur Mon Serveur a dépassé 0 (Actuel : 0) !"
        );
    }

    #[test]
    fn builds_payload() {
        let raw = SenderTask::create_notification_payload(&notification(
            AlertType::StatusToOffline,
            None,
            None,
        ));
        let payload: Value = serde_json::from_str(&raw).expect("payload should be valid JSON");

        assert_eq!(payload["title"], "Alerte Serveur: Mon Serveur");
        assert_eq!(
            payload["body"],
            "Le serveur Mon Serveur vient de passer HORS-LIGNE !"
        );
        assert_eq!(payload["url"], "/server/42");
        assert!(!payload["icon"].as_str().unwrap_or_default().is_empty());
        // Structured fields for client-side localized rendering (see
        // frontend/app/service-worker/sw.ts contract).
        assert_eq!(payload["alertType"], "status_to_offline");
        assert_eq!(payload["serverName"], "Mon Serveur");
        assert_eq!(payload["threshold"], 0);
        assert_eq!(payload["current"], 0);
    }

    #[test]
    fn builds_structured_player_payload() {
        let raw = SenderTask::create_notification_payload(&notification(
            AlertType::PlayerAbove,
            Some(10),
            Some(15),
        ));
        let payload: Value = serde_json::from_str(&raw).expect("payload should be valid JSON");

        assert_eq!(payload["alertType"], "player_above");
        assert_eq!(payload["serverName"], "Mon Serveur");
        assert_eq!(payload["threshold"], 10);
        assert_eq!(payload["current"], 15);
    }
}
