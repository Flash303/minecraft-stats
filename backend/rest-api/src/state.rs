use deadpool_redis::Pool;
use minecraft_pinger::MinecraftPinger;
use repository::repository::Repository;
use serde_json::Value;
use std::sync::Arc;

use crate::services::clerk::model::ClerkUser;
use crate::utils::cache::TtlCache;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
    pub redis_client: Pool,

    pub pigner: Arc<MinecraftPinger>,

    pub jwks: Arc<Value>,
    pub clerk_instance_url: Arc<String>,
    pub clerk_secret_key: Arc<Option<String>>,

    pub user_cache: TtlCache<String, Arc<ClerkUser>>
}
