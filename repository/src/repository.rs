use crate::models::record::Record;
use crate::models::server::{Server, ServerRow, UnregisteredServer};
use async_trait::async_trait;
use sqlx::{Executor, PgPool, QueryBuilder, Row};
use sqlx::postgres::PgPoolOptions;
use time::{Duration, OffsetDateTime};

#[async_trait]
pub trait Repository: Send + Sync {
    async fn save_pings(&self, records: &Vec<Record>) -> Result<(), String>;
    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>, interval: Duration) -> Result<Vec<Record>, String>;

    async fn list_servers(&self) -> Result<Vec<Server>, String>;
    async fn get_server(&self, server_id: u32) -> Result<Server, String>;
    async fn create_server(&self, server: UnregisteredServer) -> Result<(), String>;
    async fn update_server(&self, server: &Server) -> Result<(), String>;
    
    async fn initialize(&self) -> Result<(), String>;
}

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
        println!("Connexion réussie à PostgreSQL !");

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

    async fn get_pings(&self, server_id: u32, from: OffsetDateTime, to: Option<OffsetDateTime>, interval: Duration) -> Result<Vec<Record>, String> {
        let mut query_builder = QueryBuilder::new(
            "SELECT server_id, date, value FROM ping_records WHERE server_id = "
        );

        query_builder.push_bind(server_id as i32);

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

        let mut records = Vec::new();
        let mut next_allowed_time = from;

        for row in rows {
            let date: OffsetDateTime = row.get("date");

            if date >= next_allowed_time {
                let server_id_i32: i32 = row.get("server_id");
                let value_i32: i32 = row.get("value");

                records.push(Record {
                    server_id: server_id_i32 as u32,
                    date,
                    value: value_i32 as u32,
                });

                next_allowed_time = date + interval;
            }
        }

        Ok(records)
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

    async fn get_server(&self, server_id: u32) -> Result<Server, String> {
        let result: ServerRow = sqlx::query_as("SELECT * FROM servers WHERE id = $1")
            .bind(server_id as i32)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(result.into())
    }

    async fn create_server(&self, server: UnregisteredServer) -> Result<(), String> {
        sqlx::query("INSERT INTO servers (name, ip, port) VALUES ($1, $2, $3)")
            .bind(server.name)
            .bind(server.ip)
            .bind(server.port as i32)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn update_server(&self, server: &Server) -> Result<(), String> {
        sqlx::query("UPDATE servers SET last_favicon = $1, last_status = $2, last_connected = $3 WHERE id = $4")
            .bind(server.last_favicon.clone())
            .bind(server.last_status.clone())
            .bind(server.last_connected.map(|v| v as i32))
            .bind(server.id as i32)
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
    }

    async fn initialize(&self) -> Result<(), String> {
        self.pool.execute(
            "CREATE TABLE IF NOT EXISTS servers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,

                ip TEXT NOT NULL,
                port INTEGER NOT NULL CHECK (port >= 0 AND port <= 65535),

                last_favicon TEXT NULL,
                last_status TEXT NULL CHECK (last_status IN ('online', 'offline')),
                last_connected INTEGER NULL,
                UNIQUE (ip, port)
            )"
        ).await.map_err(|e| e.to_string())?;

        self.pool.execute(
            "CREATE TABLE IF NOT EXISTS ping_records (
                server_id INTEGER NOT NULL,
                date TIMESTAMPTZ NOT NULL,
                value INTEGER NOT NULL,

                PRIMARY KEY (server_id, date),
                FOREIGN KEY (server_id) REFERENCES servers (id)
            )"
        ).await.map_err(|e| e.to_string())?;

        Ok(())
    }
}