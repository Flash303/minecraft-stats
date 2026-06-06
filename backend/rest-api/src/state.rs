use std::sync::Arc;
use repository::repository::Repository;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,

    pub jwks: Arc<serde_json::Value>,
    pub clerk_instance_url: Arc<String>,
}