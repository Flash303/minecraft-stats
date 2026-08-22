use std::collections::HashMap;

use crate::models::record::{Record, RecordData};
use crate::models::server::{Server, DraftServer};
use crate::models::alert::{Alert, DraftAlert};
use crate::models::web_push::{WebPushSubscription, DraftWebPushSubscription};
use async_trait::async_trait;

use time::{OffsetDateTime};
use crate::error::RepositoryError;

#[async_trait]
pub trait Repository: Send + Sync {
    // Pings
    async fn save_pings(&self, records: &Vec<Record>) -> Result<(), String>;
    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<RecordData, RepositoryError>;
    async fn get_last_pings_for_servers(&self, server_ids: &[u32]) -> Result<HashMap<u32, RecordData>, RepositoryError>;

    // Servers
    async fn create_server(&self, server: DraftServer) -> Result<Server, RepositoryError>;
    async fn update_server(&self, server: &Server) -> Result<(), RepositoryError>;
    async fn update_servers(&self, servers: &Vec<Server>) -> Result<(), RepositoryError>;

    // Gets
    async fn get_server(&self, server_id: u32) -> Result<Option<Server>, RepositoryError>;
    async fn list_servers(&self) -> Result<Vec<Server>, RepositoryError>;
    async fn get_servers_of_user(&self, user_id: String) -> Result<Vec<Server>, RepositoryError>;
    async fn find_servers(&self, favicon_hash: Option<&str>, resolved_endpoint: Option<&str>, motd_hash: Option<&str>) -> Result<Vec<Server>, RepositoryError>;
    async fn count_resolved_endpoints(&self, resolved_endpoint: &str, exclude_id: Option<u32>) -> Result<u32, RepositoryError>;

    // Alerts
    async fn create_alert(&self, alert: DraftAlert) -> Result<Alert, RepositoryError>;
    async fn delete_alert(&self, alert_id: u32, user_id: String) -> Result<(), RepositoryError>;
    async fn list_alerts_for_user(&self, user_id: String) -> Result<Vec<Alert>, RepositoryError>;
    async fn list_alerts_for_server(&self, server_id: u32) -> Result<Vec<Alert>, RepositoryError>;
    async fn get_active_alerts_for_servers(&self, server_ids: &[u32]) -> Result<Vec<Alert>, RepositoryError>;

    // Web Push Subscriptions
    async fn create_subscription(&self, subscription: DraftWebPushSubscription) -> Result<WebPushSubscription, RepositoryError>;
    async fn delete_subscription(&self, endpoint: &str, user_id: &str) -> Result<(), RepositoryError>;
    async fn delete_stale_subscription(&self, endpoint: &str) -> Result<(), RepositoryError>;
    async fn get_subscriptions_for_users(&self, user_ids: &[String]) -> Result<Vec<WebPushSubscription>, RepositoryError>;
    
    async fn delete_server(&self, server_id: u32) -> Result<(), RepositoryError>;

    async fn initialize(&self) -> Result<(), RepositoryError>;
}
