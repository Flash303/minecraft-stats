use async_trait::async_trait;
use sqlx::{Executor, PgPool, QueryBuilder, Row};
use time::OffsetDateTime;
use crate::models::record::Record;
use crate::models::server::Server;

#[async_trait]
pub trait Repository: Send + Sync {
    async fn save_pings(&self, records: &Vec<Record>) -> Result<(), String>;
    async fn get_pings(&self, server_id: String, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<Vec<Record>, String>;

    async fn list_servers(&self) -> Result<Vec<Server>, String>;
    
    async fn initialize(&self) -> Result<(), String>;
}

pub struct PostgresRepository {
    pool: PgPool,
}

impl PostgresRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
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
            b.push_bind(&record.server_id)
                .push_bind(record.date)
                .push_bind(record.value as i32);
        });

        let query = query_builder.build();
        query.execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn get_pings(&self, server_id: String, from: OffsetDateTime, to: Option<OffsetDateTime>) -> Result<Vec<Record>, String> {
        let mut query_builder = QueryBuilder::new(
            "SELECT server_id, date, value FROM ping_records WHERE server_id = "
        );

        query_builder.push_bind(server_id);

        query_builder.push(" AND date >= ");
        query_builder.push_bind(from);

        if let Some(to_date) = to {
            query_builder.push(" AND date <= ");
            query_builder.push_bind(to_date);
        }

        query_builder.push(" ORDER BY date ASC");

        let query = query_builder.build();
        let rows = query
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let records = rows
            .iter()
            .map(|row| {
                let value_i32: i32 = row.get("value");

                Record {
                    server_id: row.get("server_id"),
                    date: row.get("date"),
                    value: value_i32 as u32,
                }
            })
            .collect();

        Ok(records)
    }

    async fn list_servers(&self) -> Result<Vec<Server>, String> {
        todo!()
    }

    async fn initialize(&self) -> Result<(), String> {
        self.pool.execute(
            "CREATE TABLE IF NOT EXISTS ping_records (
                server_id TEXT NOT NULL,
                date TIMESTAMPTZ NOT NULL,
                value INTEGER NOT NULL
            )"
        ).await.map_err(|e| e.to_string())?;

        self.pool.execute(
            "CREATE TABLE IF NOT EXISTS servers (
                server_id TEXT NOT NULL,
                ip TEXT NOT NULL,
                port INTEGER NOT NULL,
                last_favicon TEXT NULL
            )"
        ).await.map_err(|e| e.to_string())?;

        Ok(())
    }
}