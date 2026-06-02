use std::env;
use std::time::Duration;
use sqlx::postgres::PgPoolOptions;
use time::{OffsetDateTime, Duration as OtherDuration};
use repository::models::record::Record;
use repository::repository::{PostgresRepository, Repository};

#[tokio::main]
async fn main() {
    println!("Hello, world!");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(Duration::from_secs(3))
        .connect(&database_url)
        .await
        .map_err(|e| e.to_string())
        .unwrap();
    println!("Connexion réussie à PostgreSQL !");

    let repository = PostgresRepository::new(pool);
    repository.initialize()
        .await
        .map_err(|e| e.to_string())
        .unwrap();
    println!("Initialized successfully!");

    let test_records = vec![Record {
        server_id: "fucking_test".to_string(),
        date: OffsetDateTime::now_utc(),
        value: 50
    }];

    repository.save_pings(&test_records)
        .await
        .map_err(|e| e.to_string())
        .unwrap();

    let rs = repository.get_pings("fucking_test".to_string(),
                                  OffsetDateTime::now_utc().checked_sub(OtherDuration::new(3600, 0)).unwrap(),
                                  None)
        .await;

    if let Ok(records) = rs {
        println!("Retrieved records: {:?}", records);
    } else {
        println!("Failed to retrieve records: {:?}", rs.err());
    }
}