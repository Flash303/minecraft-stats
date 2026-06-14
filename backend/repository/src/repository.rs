use std::collections::HashMap;

use crate::models::record::{Record, RecordData};
use crate::models::server::{Server, UnregisteredServer};
use async_trait::async_trait;

use time::{OffsetDateTime};

#[async_trait]
pub trait Repository: Send + Sync {
    async fn save_pings(&self, records: &Vec<Record>) -> Result<(), String>;

    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<RecordData, String>;
    async fn get_last_pings_for_servers(&self, server_ids: &[u32]) -> Result<HashMap<u32, RecordData>, String>;

    async fn create_server(&self, server: UnregisteredServer) -> Result<Server, String>;

    async fn update_server(&self, server: &Server) -> Result<(), String>;
    async fn update_servers(&self, servers: &Vec<Server>) -> Result<(), String>;

    async fn list_servers(&self) -> Result<Vec<Server>, String>;

    async fn get_server(&self, server_id: u32) -> Result<Server, String>;
    async fn get_servers_of_user(&self, user_id: String) -> Result<Vec<Server>, String>;

    async fn find_servers(&self, favicon_hash: Option<&str>, resolved_endpoint: Option<&str>, motd_hash: Option<&str>) -> Result<Vec<Server>, String>;
    async fn count_resolved_endpoints(&self, resolved_endpoint: &str, exclude_id: Option<u32>) -> Result<u32, String>;

    async fn is_admin(&self, user_id: String) -> Result<bool, String>;

    async fn initialize(&self) -> Result<(), String>;
}
