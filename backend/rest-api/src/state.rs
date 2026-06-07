use std::sync::Arc;
use minecraft_pinger::MinecraftPinger;
use repository::repository::Repository;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
    pub pigner: Arc<MinecraftPinger>,

    pub jwks: Arc<serde_json::Value>,
    pub clerk_instance_url: Arc<String>,
}