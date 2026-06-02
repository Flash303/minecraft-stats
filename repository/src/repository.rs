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
    async fn create_server(&self, server: Server) -> Result<(), String>;
    
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
                let server_id_i32: i32 = row.get("server_id");
                let value_i32: i32 = row.get("value");

                Record {
                    server_id: server_id_i32 as u32,
                    date: row.get("date"),
                    value: value_i32 as u32,
                }
            })
            .collect();

        Ok(records)
    }

    async fn list_servers(&self) -> Result<Vec<Server>, String> {
        let rows = sqlx::query("SELECT id, name, ip, port, last_favicon FROM servers")
            .fetch_all(&self.pool)
            .await
            .map_err(|e| e.to_string())?;

        let mut rs: Vec<Server> = Vec::new();
        for row in rows {
            let id_i32: i32 = row.get("id");
            let port_i16: i32 = row.get("port");

            let server = Server {
                id: id_i32 as u32,
                name: row.get("name"),

                ip: row.get("ip"),
                port: port_i16 as u16,
                last_favicon: row.get("last_favicon"),
            };
            rs.push(server);
        }

        Ok(rs)
    }

    async fn create_server(&self, server: Server) -> Result<(), String> {
        sqlx::query("INSERT INTO servers (id, name, ip, port, last_favicon) VALUES ($1, $2, $3, $4, $5)")
            .bind(server.id as i64)
            .bind(server.name)
            .bind(server.ip)
            .bind(server.port as i32)
            .bind(server.last_favicon)
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
                last_favicon TEXT NULL
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