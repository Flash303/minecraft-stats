use repository::models::alert::Alert;
use repository::models::server::ServerStatus::Offline;
use repository::models::server::{Server, ServerStatus};

pub const MC_DEFAULT_ICON: &str = "https://wd40.theking90000.be/files/ee292f4a-dfff-4c5f-b65e-1beca56ec24f";

pub enum WorkerToVerifier {
    ServerStatusUpdated(ServerStateChange)
}

#[derive(Clone)]
pub struct ServerStateChange {
    pub id: u32,
    pub name: String,

    pub last_favicon: Option<String>,

    pub old_status: Option<ServerStatus>,
    pub old_players: Option<u32>,

    pub new_status: ServerStatus,
    pub new_players: Option<u32>,
}

impl ServerStateChange {
    pub fn edit_new_status(&mut self, server: &Server) {
        self.new_status = server.last_status.clone().unwrap();
        self.new_players = server.last_connected.clone()
    }
}

impl From<&Server> for ServerStateChange {
    fn from(server: &Server) -> Self {
        Self {
            id: server.id,
            name: server.name.clone(),

            last_favicon: server.last_favicon.clone(),

            old_status: server.last_status.clone(),
            old_players: server.last_connected.clone(),

            // Two values changed before server update
            new_status: Offline,
            new_players: None
        }
    }
}

pub enum VerifierToSender {
    TriggerNotification(TriggeredAlertNotification),
}

pub struct TriggeredAlertNotification {
    pub alert: Alert,

    pub server_name: String,
    pub last_favicon: Option<String>,

    pub old_status: Option<ServerStatus>,
    pub old_players: Option<u32>,

    pub new_status: ServerStatus,
    pub new_players: Option<u32>,
}

impl TriggeredAlertNotification {
    pub fn get_logo(&self) -> String {
        // match self.alert.alert_type {
        //     AlertType::StatusToOffline => "https://wd40.theking90000.be/files/27d66d43-5bd8-487b-8c21-a8f37b5b67fa".to_string(),
        //     AlertType::StatusToOnline => "https://wd40.theking90000.be/files/27d66d43-5bd8-487b-8c21-a8f37b5b67fa".to_string(),
        //     AlertType::PlayerAbove => "https://wd40.theking90000.be/files/27d66d43-5bd8-487b-8c21-a8f37b5b67fa".to_string(),
        //     AlertType::PlayerBelow => "https://wd40.theking90000.be/files/27d66d43-5bd8-487b-8c21-a8f37b5b67fa".to_string(),
        // }

        self.last_favicon.clone().unwrap_or(MC_DEFAULT_ICON.to_string())
    }

    pub fn from(state: &ServerStateChange, alert: Alert) -> Self {
        Self {
            alert,

            server_name: state.name.clone(),
            last_favicon: state.last_favicon.clone(),

            old_status: state.old_status.clone(),
            old_players: state.old_players,

            new_status: state.new_status.clone(),
            new_players: state.new_players,
        }
    }
}