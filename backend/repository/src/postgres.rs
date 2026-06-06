use async_trait::async_trait;
use sqlx::{Executor, PgPool, QueryBuilder, Row};
use sqlx::postgres::PgPoolOptions;
use time::{Duration, OffsetDateTime};
use crate::models::record::Record;
use crate::models::server::{Server, ServerRow, UnregisteredServer};
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

    async fn create_server(&self, server: UnregisteredServer) -> Result<Server, String> {
        let server: ServerRow = sqlx::query_as(
            "INSERT INTO servers (name, ip, port, favicon_hash, motd_hash, resolved_endpoint)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING *")
            .bind(server.name)
            .bind(server.ip)
            .bind(server.port as i32)
            .bind(server.favicon_hash)
            .bind(server.motd_hash)
            .bind(server.resolved_endpoint)
            .fetch_one(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(server.into())
    }

    async fn update_server(&self, server: &Server) -> Result<(), String> {
        sqlx::query("UPDATE servers SET last_favicon = $1, last_status = $2, last_connected = $3, last_version = $4, favicon_hash = $6, motd_hash = $7, resolved_endpoint = $8 WHERE id = $5")
            .bind(server.last_favicon.clone())
            .bind(server.last_status.clone())
            .bind(server.last_connected.map(|v| v as i32))
            .bind(server.last_version.clone())
            .bind(server.id as i32)
            .bind(server.favicon_hash.clone())
            .bind(server.motd_hash.clone())
            .bind(server.resolved_endpoint.clone())
            .execute(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        Ok(())
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
                last_version TEXT NULL,
                favicon_hash TEXT NULL,
                motd_hash TEXT NULL,
                resolved_endpoint TEXT NULL,
                UNIQUE (ip, port)
            )"
        ).await.map_err(|e| e.to_string())?;

        // Ensure columns exist (for existing databases)
        self.pool.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS favicon_hash TEXT").await.map_err(|e| e.to_string())?;
        self.pool.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS motd_hash TEXT").await.map_err(|e| e.to_string())?;
        self.pool.execute("ALTER TABLE servers ADD COLUMN IF NOT EXISTS resolved_endpoint TEXT").await.map_err(|e| e.to_string())?;

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