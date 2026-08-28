use std::collections::HashMap;

use async_trait::async_trait;
use sqlx::{PgPool, QueryBuilder, Row};
use sqlx::postgres::PgPoolOptions;
use time::{Duration, OffsetDateTime};
use crate::models::record::{Record, RecordData};
use crate::models::server::{Server, ServerRow, DraftServer};
use crate::models::alert::{Alert, AlertRow, DraftAlert};
use crate::models::mojang::MojangApiDowntime;
use crate::models::web_push::{WebPushSubscription, WebPushSubscriptionRow, DraftWebPushSubscription};
use crate::repository::Repository;
use futures::stream::StreamExt;
use log::{info};
use crate::error::RepositoryError;

#[derive(Clone)]
pub struct PostgresRepository {
    pool: PgPool,
}

impl PostgresRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn from_url(url: String) -> Result<Self, String> {
        let pool = PgPoolOptions::new()
            .max_connections(50)
            .acquire_timeout(std::time::Duration::from_secs(3))
            .connect(&url)
            .await
            .map_err(|e| e.to_string())?;
        info!("PostgreSQL connection success !");

        let repository = PostgresRepository::new(pool);
        repository.initialize()
            .await
            .map_err(|e| e.to_string())?;
        info!("Initialized successfully!");

        Ok(repository)
    }
}

#[async_trait]
impl Repository for PostgresRepository {
    async fn save_pings(&self, records: &Vec<Record>) -> Result<(), String> {
        if records.is_empty() {
            return Ok(());
        }

        let mut query_builder = QueryBuilder::new("INSERT INTO ping_records (server_id, date, value) ");

        query_builder.push_values(records, |mut b, record| {
            b.push_bind(record.server_id as i32)
                .push_bind(record.date)
                .push_bind(record.value as i32);
        });

        let query = query_builder.build();
        query.execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<RecordData, RepositoryError> {
        let mut query_builder = QueryBuilder::new(
            "SELECT date, value
            FROM ping_records
            WHERE server_id = "
        );
        query_builder.push_bind(server_id as i32);
        query_builder.push(" AND date >= ").push_bind(from);

        if let Some(to_date) = to {
            query_builder.push(" AND date <= ").push_bind(to_date);
        }

        query_builder.push(" ORDER BY date ASC");

        let query = query_builder.build();
        let mut rows = query.fetch(&self.pool);

        let mut dates = Vec::new();
        let mut values = Vec::new();

        while let Some(row) = rows.next().await {
            let row = row?;

            let date: OffsetDateTime = row.get("date");
            let value_i32: i32 = row.get("value");

            dates.push(date.unix_timestamp());
            values.push(value_i32 as u32);
        }

        Ok(RecordData(dates, values))
    }

    async fn get_last_pings_for_servers(&self, server_ids: &[u32]) -> Result<HashMap<u32, RecordData>, RepositoryError> {
        let ids: Vec<i32> = server_ids.iter().map(|&id| id as i32).collect();
        let from = OffsetDateTime::now_utc() - Duration::days(1);
    
        let records = sqlx::query(
            "SELECT 
                server_id,
                time_bucket,
                agg_value
            FROM ping_records_5m_agg
            WHERE server_id = ANY($1) AND time_bucket >= $2
            ORDER BY server_id, time_bucket ASC"
        )
        .bind(&ids)
        .bind(from)
        .fetch_all(&self.pool)
        .await?;

        let mut map: HashMap<u32, RecordData> = HashMap::with_capacity(ids.len());
    
        for row in records {
            let server_id: u32 = row.get::<i32, _>("server_id") as u32;
            let date: OffsetDateTime = row.get("time_bucket");
            let value: u32 = row.get::<i32, _>("agg_value") as u32;
    
            let uplot_data = map
                .entry(server_id)
                .or_insert_with(|| RecordData(Vec::new(), Vec::new()));
            
            uplot_data.0.push(date.unix_timestamp());
            uplot_data.1.push(value);
        }
    
        Ok(map)
    }

    async fn create_server(&self, server: DraftServer) -> Result<Server, RepositoryError> {
        let server: ServerRow = sqlx::query_as(
            "INSERT INTO servers (name, ip, user_id, port, favicon_hash, motd_hash, resolved_endpoint, type)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING *")
            .bind(server.name)
            .bind(server.ip)
            .bind(server.user_id.unwrap())
            .bind(server.port as i32)
            .bind(server.favicon_hash)
            .bind(server.motd_hash)
            .bind(server.resolved_endpoint)
            .bind(server.server_type)
            .fetch_one(&self.pool)
            .await?;

        Ok(server.into())
    }

    async fn update_server(&self, server: &Server) -> Result<(), RepositoryError> {
        sqlx::query("UPDATE servers SET
                   last_favicon = $1,
                   last_status = $2,
                   last_connected = $3,
                   last_version = $4,
                   last_max_players = $5,
                   last_motd = $6,

                   favicon_hash = $7,
                   motd_hash = $8,
                   resolved_endpoint = $9,
                   hidden = $10,
                   name = $11,
                   last_ping_time = $12,
                   last_sample = $13,
                   forced_favicon = $14,
                   last_protocol_version = $15,
                   ip = $16,
                   port = $17
               WHERE id = $18")
            .bind(server.last_favicon.clone())
            .bind(server.last_status.clone())
            .bind(server.last_connected.map(|v| v as i32))
            .bind(server.last_version.clone())
            .bind(server.last_max_players.clone())
            .bind(server.last_motd.clone())
            .bind(server.favicon_hash.clone())
            .bind(server.motd_hash.clone())
            .bind(server.resolved_endpoint.clone())
            .bind(server.hidden)
            .bind(server.name.clone())
            .bind(server.last_ping_time.map(|v| v as i32))
            .bind(server.last_sample.clone())
            .bind(server.forced_favicon)
            .bind(server.last_protocol_version)
            .bind(server.ip.clone())
            .bind(server.port as i32)
            .bind(server.id as i32)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

      async fn update_servers(&self, servers: &Vec<Server>) -> Result<(), RepositoryError> {
        if servers.is_empty() {
            return Ok(());
        }

        let mut ids = Vec::with_capacity(servers.len());
        let mut favicons = Vec::with_capacity(servers.len());
        let mut statuses = Vec::with_capacity(servers.len());
        let mut last_connected = Vec::with_capacity(servers.len());
        let mut versions = Vec::with_capacity(servers.len());
        let mut favicon_hashes = Vec::with_capacity(servers.len());
        let mut motd_hashes = Vec::with_capacity(servers.len());
        let mut endpoints = Vec::with_capacity(servers.len());
        let mut names = Vec::with_capacity(servers.len());
        let mut last_max_players = Vec::with_capacity(servers.len());
        let mut last_motds = Vec::with_capacity(servers.len());
        let mut last_ping_times = Vec::with_capacity(servers.len());
        let mut last_samples = Vec::with_capacity(servers.len());
        let mut forced_favicons = Vec::with_capacity(servers.len());
        let mut last_protocol_versions = Vec::with_capacity(servers.len());

        for s in servers {
            ids.push(s.id as i32);
            favicons.push(s.last_favicon.clone());
            statuses.push(s.last_status.clone());
            last_connected.push(s.last_connected.map(|v| v as i32));
            versions.push(s.last_version.clone());
            favicon_hashes.push(s.favicon_hash.clone());
            motd_hashes.push(s.motd_hash.clone());
            endpoints.push(s.resolved_endpoint.clone());
            names.push(s.name.clone());
            last_max_players.push(s.last_max_players);
            last_motds.push(s.last_motd.clone());
            last_ping_times.push(s.last_ping_time.map(|v| v as i32));
            last_samples.push(s.last_sample.clone());
            forced_favicons.push(s.forced_favicon);
            last_protocol_versions.push(s.last_protocol_version);
        }

        sqlx::query(
            r#"
            UPDATE servers AS s
            SET
                name = u.name,
                last_favicon = u.last_favicon,
                last_status = u.last_status,
                last_connected = u.last_connected,
                last_version = u.last_version,
                favicon_hash = u.favicon_hash,
                motd_hash = u.motd_hash,
                resolved_endpoint = u.resolved_endpoint,
                last_max_players = u.last_max_players,
                last_motd = u.last_motd,
                last_ping_time = u.last_ping_time,
                last_sample = u.last_sample,
                forced_favicon = u.forced_favicon,
                last_protocol_version = u.last_protocol_version
            FROM UNNEST($1::int[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::int4[], $11::text[], $12::int4[], $13::text[], $14::bool[], $15::int8[])
            AS u(id, last_favicon, last_status, last_connected, last_version, favicon_hash, motd_hash, resolved_endpoint, name, last_max_players, last_motd, last_ping_time, last_sample, forced_favicon, last_protocol_version)
            WHERE s.id = u.id
            "#
        )
        .bind(&ids)
        .bind(&favicons)
        .bind(&statuses)
        .bind(&last_connected)
        .bind(&versions)
        .bind(&favicon_hashes)
        .bind(&motd_hashes)
        .bind(&endpoints)
        .bind(&names)
        .bind(&last_max_players)
        .bind(&last_motds)
        .bind(&last_ping_times)
        .bind(&last_samples)
        .bind(&forced_favicons)
        .bind(&last_protocol_versions)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_server(&self, server_id: u32) -> Result<Option<Server>, RepositoryError> {
        let result: Option<ServerRow> = sqlx::query_as("SELECT * FROM servers WHERE id = $1")
            .bind(server_id as i32)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result.map(|r| r.into()))
    }

    async fn list_servers(&self) -> Result<Vec<Server>, RepositoryError> {
        let rows: Vec<ServerRow> = sqlx::query_as("SELECT * FROM servers")
            .fetch_all(&self.pool)
            .await?;

        let mut rs: Vec<Server> = Vec::new();
        for row in rows {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn get_servers_of_user(&self, user_id: String) -> Result<Vec<Server>, RepositoryError> {
        let result: Vec<ServerRow> = sqlx::query_as("SELECT * FROM servers WHERE user_id = $1")
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;

        let mut rs: Vec<Server> = Vec::new();
        for row in result {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn get_server_without_favicon(&self, server_id: u32) -> Result<Option<Server>, RepositoryError> {
        let result: Option<ServerRow> = sqlx::query_as(
            "SELECT id, name, user_id, ip, port, type, hidden, registered_date, forced_favicon,
                    NULL::text AS last_favicon,
                    last_status, last_connected, last_version, last_max_players, last_motd,
                    last_ping_time, last_sample, last_protocol_version,
                    favicon_hash, motd_hash, resolved_endpoint
             FROM servers WHERE id = $1")
            .bind(server_id as i32)
            .fetch_optional(&self.pool)
            .await?;

        Ok(result.map(|r| r.into()))
    }

    async fn list_servers_without_favicon(&self) -> Result<Vec<Server>, RepositoryError> {
        let rows: Vec<ServerRow> = sqlx::query_as(
            "SELECT id, name, user_id, ip, port, type, hidden, registered_date, forced_favicon,
                    NULL::text AS last_favicon,
                    last_status, last_connected, last_version, last_max_players, last_motd,
                    last_ping_time, last_sample, last_protocol_version,
                    favicon_hash, motd_hash, resolved_endpoint
             FROM servers")
            .fetch_all(&self.pool)
            .await?;

        let mut rs: Vec<Server> = Vec::new();
        for row in rows {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn get_servers_of_user_without_favicon(&self, user_id: String) -> Result<Vec<Server>, RepositoryError> {
        let rows: Vec<ServerRow> = sqlx::query_as(
            "SELECT id, name, user_id, ip, port, type, hidden, registered_date, forced_favicon,
                    NULL::text AS last_favicon,
                    last_status, last_connected, last_version, last_max_players, last_motd,
                    last_ping_time, last_sample, last_protocol_version,
                    favicon_hash, motd_hash, resolved_endpoint
             FROM servers WHERE user_id = $1")
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;

        let mut rs: Vec<Server> = Vec::new();
        for row in rows {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn find_servers(&self, favicon_hash: Option<&str>, resolved_endpoint: Option<&str>, motd_hash: Option<&str>) -> Result<Vec<Server>, RepositoryError> {
        let mut query = QueryBuilder::new("SELECT * FROM servers WHERE 1=0");

        if let Some(h) = favicon_hash {
            query.push(" OR favicon_hash = ");
            query.push_bind(h);
        }
        if let Some(e) = resolved_endpoint {
            query.push(" OR resolved_endpoint = ");
            query.push_bind(e);
        }
        if let Some(h) = motd_hash {
            query.push(" OR motd_hash = ");
            query.push_bind(h);
        }

        let rows: Vec<ServerRow> = query.build_query_as()
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn count_resolved_endpoints(&self, resolved_endpoint: &str, exclude_id: Option<u32>) -> Result<u32, RepositoryError> {
        let mut query = QueryBuilder::new("SELECT COUNT(*) FROM servers WHERE resolved_endpoint = ");
        query.push_bind(resolved_endpoint);
        if let Some(id) = exclude_id {
            query.push(" AND id != ");
            query.push_bind(id as i32);
        }

        let row: (i64,) = query.build_query_as::<(i64,)>()
            .fetch_one(&self.pool)
            .await?;

        Ok(row.0 as u32)
    }

    async fn create_alert(&self, alert: DraftAlert) -> Result<Alert, RepositoryError> {
        let row: AlertRow = sqlx::query_as(
            "INSERT INTO alerts (user_id, server_id, alert_type, player_threshold, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *"
        )
        .bind(alert.user_id)
        .bind(alert.server_id as i32)
        .bind(alert.alert_type)
        .bind(alert.player_threshold.map(|v| v as i32))
        .bind(alert.is_active)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.into())
    }

    async fn delete_alert(&self, alert_id: u32, user_id: String) -> Result<(), RepositoryError> {
        sqlx::query(
            "DELETE FROM alerts WHERE id = $1 AND user_id = $2"
        )
        .bind(alert_id as i32)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn list_alerts_for_user(&self, user_id: String) -> Result<Vec<Alert>, RepositoryError> {
        let rows: Vec<AlertRow> = sqlx::query_as(
            "SELECT * FROM alerts WHERE user_id = $1"
        )
            .bind(user_id)
            .fetch_all(&self.pool)
            .await?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn list_alerts_for_server(&self, server_id: u32) -> Result<Vec<Alert>, RepositoryError> {
        let rows: Vec<AlertRow> = sqlx::query_as(
            "SELECT * FROM alerts WHERE server_id = $1"
        )
        .bind(server_id as i32)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn get_active_alerts_for_servers(&self, server_ids: &[u32]) -> Result<Vec<Alert>, RepositoryError> {
        let ids: Vec<i32> = server_ids.iter().map(|&id| id as i32).collect();
        let rows: Vec<AlertRow> = sqlx::query_as(
            "SELECT * FROM alerts WHERE server_id = ANY($1) AND is_active = TRUE"
        )
        .bind(&ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter()
            .map(|r| r.into())
            .collect())
    }

    async fn create_subscription(&self, subscription: DraftWebPushSubscription) -> Result<WebPushSubscription, RepositoryError> {
        let row: WebPushSubscriptionRow = sqlx::query_as(
            "INSERT INTO web_push_subscriptions (user_id, endpoint, p256dh, auth)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (endpoint) DO UPDATE SET
                 user_id = EXCLUDED.user_id,
                 p256dh = EXCLUDED.p256dh,
                 auth = EXCLUDED.auth,
                 created_at = NOW()
             RETURNING *"
        )
        .bind(subscription.user_id)
        .bind(subscription.endpoint)
        .bind(subscription.p256dh)
        .bind(subscription.auth)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.into())
    }

    async fn delete_subscription(&self, endpoint: &str, user_id: &str) -> Result<(), RepositoryError> {
        sqlx::query(
            "DELETE FROM web_push_subscriptions WHERE endpoint = $1 AND user_id = $2"
        )
        .bind(endpoint)
        .bind(user_id)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn delete_stale_subscription(&self, endpoint: &str) -> Result<(), RepositoryError> {
        sqlx::query(
            "DELETE FROM web_push_subscriptions WHERE endpoint = $1"
        )
        .bind(endpoint)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    async fn get_subscriptions_for_users(&self, user_ids: &[String]) -> Result<Vec<WebPushSubscription>, RepositoryError> {
        let rows: Vec<WebPushSubscriptionRow> = sqlx::query_as(
            "SELECT * FROM web_push_subscriptions WHERE user_id = ANY($1)"
        )
        .bind(user_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn delete_server(&self, server_id: u32) -> Result<(), RepositoryError> {
        let mut tx = self.pool.begin().await?;

        sqlx::query("DELETE FROM alerts WHERE server_id = $1")
            .bind(server_id as i32)
            .execute(&mut *tx)
            .await?;

        sqlx::query("DELETE FROM ping_records WHERE server_id = $1")
            .bind(server_id as i32)
            .execute(&mut *tx)
            .await?;

        sqlx::query("DELETE FROM servers WHERE id = $1")
            .bind(server_id as i32)
            .execute(&mut *tx)
            .await?;

        tx.commit().await?;

        Ok(())
    }

    async fn get_mojang_api_status(&self) -> Result<bool, RepositoryError> {
        let row: (bool,) = sqlx::query_as("SELECT is_down FROM mojang_api_status WHERE id = 1")
            .fetch_one(&self.pool)
            .await?;
        Ok(row.0)
    }

    async fn set_mojang_api_status(&self, is_down: bool) -> Result<(), RepositoryError> {
        sqlx::query("UPDATE mojang_api_status SET is_down = $1, updated_at = NOW() WHERE id = 1")
            .bind(is_down)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn start_mojang_api_downtime(&self, start_time: OffsetDateTime) -> Result<(), RepositoryError> {
        sqlx::query("INSERT INTO mojang_api_downtimes (start_time) VALUES ($1)")
            .bind(start_time)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn end_mojang_api_downtime(&self, end_time: OffsetDateTime) -> Result<(), RepositoryError> {
        sqlx::query("UPDATE mojang_api_downtimes SET end_time = $1 WHERE end_time IS NULL")
            .bind(end_time)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    async fn get_mojang_api_downtimes(&self, limit: u32) -> Result<Vec<MojangApiDowntime>, RepositoryError> {
        let downtimes = sqlx::query_as::<_, MojangApiDowntime>("SELECT id, start_time, end_time FROM mojang_api_downtimes ORDER BY start_time DESC LIMIT $1")
            .bind(limit as i64)
            .fetch_all(&self.pool)
            .await?;
        Ok(downtimes)
    }

    async fn initialize(&self) -> Result<(), RepositoryError> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await?;

        Ok(())
    }
}
