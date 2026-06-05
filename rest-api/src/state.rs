use std::sync::Arc;
use jsonwebtoken::jwk::JwkSet;
use repository::repository::Repository;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
    
    pub jwks: Arc<JwkSet>,
    pub clerk_instance_url: Arc<String>,
}