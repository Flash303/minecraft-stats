use std::sync::Arc;
use minecraft_pinger::MinecraftPinger;
use repository::repository::Repository;

use crate::{clerk::model::ClerkUser, utils::cache::TtlCache};

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
    pub pigner: Arc<MinecraftPinger>,

    pub jwks: Arc<serde_json::Value>,
    pub clerk_instance_url: Arc<String>,

    pub clerk_secret_key: Arc<Option<String>>,

    pub user_cache: TtlCache<String, Arc<ClerkUser>>
}
