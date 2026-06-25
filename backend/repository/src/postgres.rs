use std::collections::HashMap;

use async_trait::async_trait;
use sqlx::{PgPool, QueryBuilder, Row};
use sqlx::postgres::PgPoolOptions;
use time::{Duration, OffsetDateTime};
use crate::models::record::{Record, RecordData};
use crate::models::server::{Server, ServerRow, DraftServer};
use crate::models::alert::{Alert, AlertRow, DraftAlert};
use crate::models::web_push::{WebPushSubscription, WebPushSubscriptionRow, DraftWebPushSubscription};
use crate::repository::Repository;

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
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(3))
            .connect(&url)
            .await
            .map_err(|e| e.to_string())?;
        println!("PostgreSQL connection success !");

        let repository = PostgresRepository::new(pool);
        repository.initialize()
            .await
            .map_err(|e| e.to_string())?;
        println!("Initialized successfully!");

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

    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<RecordData, String> {
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
        let rows = query.fetch_all(&self.pool).await.map_err(|e| e.to_string())?;

        let capacity = rows.len();
        let mut dates = Vec::with_capacity(capacity);
        let mut values = Vec::with_capacity(capacity);

        for row in rows {
            let date: OffsetDateTime = row.get("date");
            let value_i32: i32 = row.get("value");

            dates.push(date.unix_timestamp());
            values.push(value_i32 as u32);
        }

        Ok(RecordData(dates, values))
    }

    async fn get_last_pings_for_servers(&self, server_ids: &[u32]) -> Result<HashMap<u32, RecordData>, String> {
        let ids: Vec<i32> = server_ids.iter().map(|&id| id as i32).collect();
        let from = OffsetDateTime::now_utc() - Duration::days(1);
    
        let records = sqlx::query(
            "SELECT 
                server_id,
                time_bucket('5 minutes', date) as time_bucket,
                MAX(value)::integer as agg_value
            FROM ping_records
            WHERE server_id = ANY($1) AND date >= $2
            GROUP BY server_id, time_bucket
            ORDER BY server_id, time_bucket ASC"
        )
        .bind(&ids)
        .bind(from)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

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

    async fn create_server(&self, server: DraftServer) -> Result<Server, String> {
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
            .await
            .map_err(|e| e.to_string())?;

        Ok(server.into())
    }

    async fn update_server(&self, server: &Server) -> Result<(), String> {
        sqlx::query("UPDATE servers SET last_favicon = $1, last_status = $2, last_connected = $3, last_version = $4, favicon_hash = $6, motd_hash = $7, resolved_endpoint = $8, hidden = $9, name = $10 WHERE id = $5")
            .bind(server.last_favicon.clone())
            .bind(server.last_status.clone())
            .bind(server.last_connected.map(|v| v as i32))
            .bind(server.last_version.clone())
            .bind(server.id as i32)
            .bind(server.favicon_hash.clone())
            .bind(server.motd_hash.clone())
            .bind(server.resolved_endpoint.clone())
            .bind(server.hidden)
            .bind(server.name.clone())
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

      async fn update_servers(&self, servers: &Vec<Server>) -> Result<(), String> {
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
                resolved_endpoint = u.resolved_endpoint
            FROM UNNEST($1::int[], $2::text[], $3::text[], $4::int[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
            AS u(id, last_favicon, last_status, last_connected, last_version, favicon_hash, motd_hash, resolved_endpoint, name)
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
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_server(&self, server_id: u32) -> Result<Server, String> {
        let result: ServerRow = sqlx::query_as("SELECT * FROM servers WHERE id = $1")
            .bind(server_id as i32)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result.into())
    }

    async fn list_servers(&self) -> Result<Vec<Server>, String> {
        let rows: Vec<ServerRow> = sqlx::query_as("SELECT * FROM servers")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut rs: Vec<Server> = Vec::new();
        for row in rows {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn get_servers_of_user(&self, user_id: String) -> Result<Vec<Server>, String> {
        let result: Vec<ServerRow> = sqlx::query_as("SELECT * FROM servers WHERE user_id = $1")
            .bind(user_id)
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut rs: Vec<Server> = Vec::new();
        for row in result {
            rs.push(row.into());
        }

        Ok(rs)
    }

    async fn find_servers(&self, favicon_hash: Option<&str>, resolved_endpoint: Option<&str>, motd_hash: Option<&str>) -> Result<Vec<Server>, String> {
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
            .await
            .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn count_resolved_endpoints(&self, resolved_endpoint: &str, exclude_id: Option<u32>) -> Result<u32, String> {
        let mut query = QueryBuilder::new("SELECT COUNT(*) FROM servers WHERE resolved_endpoint = ");
        query.push_bind(resolved_endpoint);
        if let Some(id) = exclude_id {
            query.push(" AND id != ");
            query.push_bind(id as i32);
        }

        let row: (i64,) = query.build_query_as::<(i64,)>()
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(row.0 as u32)
    }

    async fn create_alert(&self, alert: DraftAlert) -> Result<Alert, String> {
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
        .await
        .map_err(|e| e.to_string())?;

        Ok(row.into())
    }

    async fn delete_alert(&self, alert_id: u32, user_id: String) -> Result<(), String> {
        sqlx::query(
            "DELETE FROM alerts WHERE id = $1 AND user_id = $2"
        )
        .bind(alert_id as i32)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn list_alerts_for_server(&self, server_id: u32) -> Result<Vec<Alert>, String> {
        let rows: Vec<AlertRow> = sqlx::query_as(
            "SELECT * FROM alerts WHERE server_id = $1"
        )
        .bind(server_id as i32)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn get_active_alerts_for_servers(&self, server_ids: &[u32]) -> Result<Vec<Alert>, String> {
        let ids: Vec<i32> = server_ids.iter().map(|&id| id as i32).collect();
        let rows: Vec<AlertRow> = sqlx::query_as(
            "SELECT * FROM alerts WHERE server_id = ANY($1) AND is_active = TRUE"
        )
        .bind(&ids)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn create_subscription(&self, subscription: DraftWebPushSubscription) -> Result<WebPushSubscription, String> {
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
        .await
        .map_err(|e| e.to_string())?;

        Ok(row.into())
    }

    async fn delete_subscription(&self, endpoint: &str, user_id: &str) -> Result<(), String> {
        sqlx::query(
            "DELETE FROM web_push_subscriptions WHERE endpoint = $1 AND user_id = $2"
        )
        .bind(endpoint)
        .bind(user_id)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn delete_stale_subscription(&self, endpoint: &str) -> Result<(), String> {
        sqlx::query(
            "DELETE FROM web_push_subscriptions WHERE endpoint = $1"
        )
        .bind(endpoint)
        .execute(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_subscriptions_for_users(&self, user_ids: &[String]) -> Result<Vec<WebPushSubscription>, String> {
        let rows: Vec<WebPushSubscriptionRow> = sqlx::query_as(
            "SELECT * FROM web_push_subscriptions WHERE user_id = ANY($1)"
        )
        .bind(user_ids)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| e.to_string())?;

        Ok(rows.into_iter().map(|r| r.into()).collect())
    }

    async fn initialize(&self) -> Result<(), String> {
        sqlx::migrate!("./migrations")
            .run(&self.pool)
            .await
            .map_err(|e| format!("SQLx migration error : {e}"))?;

        Ok(())
    }
}
