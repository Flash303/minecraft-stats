use repository::models::server::{Server, ServerStatus};
use repository::models::server::ServerStatus::Offline;

pub enum WorkerToVerifier {
    ServerStatusUpdated(ServerStateChange)
}

#[derive(Clone)]
pub struct ServerStateChange {
    pub id: u32,
    pub name: String,

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

            old_status: server.last_status.clone(),
            old_players: server.last_connected.clone(),

            // Two values changed before server update
            new_status: Offline,
            new_players: None
        }
    }
}

// Data struct more simple of a server state
pub struct ServerState {
    pub id: u32,
    pub name: String,

    pub status: ServerStatus,
    pub online_number: Option<u32>,
}

impl From<&Server> for ServerState {
    fn from(server: &Server) -> Self {
        Self {
            id: server.id,
            name: server.name.clone(),

            status: server.last_status.clone().unwrap(),
            online_number: server.last_connected,
        }
    }
}