use std::sync::Arc;
use repository::repository::Repository;

#[derive(Clone)]
pub struct AppState {
    pub repository: Arc<dyn Repository>,
}