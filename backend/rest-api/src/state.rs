use dashmap::DashMap;
use minecraft_pinger::MinecraftPinger;
use repository::repository::Repository;
use reqwest::Client;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::services::clerk::account_checker::JwksStore;
use crate::services::clerk::model::ClerkUser;
use crate::services::clients::laby::RawLabyServer;
use crate::services::clients::lunar::{RawLunarPartnerServer, RawLunarServer};
use crate::utils::cache::TtlCache;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
    pub pinger: Arc<MinecraftPinger>,
    
    pub http_client: Client,

    pub jwks: JwksStore,
    pub clerk_instance_url: Arc<String>,

    pub clerk_secret_key: Arc<Option<String>>,

    pub user_cache: TtlCache<String, Arc<ClerkUser>>,

    pub laby_partner_cache: Arc<DashMap<String, bool>>,
    pub laby_servers_cache: Arc<RwLock<Vec<Arc<RawLabyServer>>>>,

    pub lunar_servers_cache: Arc<RwLock<Vec<Arc<RawLunarServer>>>>,
    pub lunar_partner_cache: Arc<DashMap<String, RawLunarPartnerServer>>,
}
