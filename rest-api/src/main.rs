pub mod error;
pub mod state;
pub mod routes;
pub mod response;

use std::env;
use std::sync::Arc;
use std::time::Duration;
use axum::response::Html;
use axum::Router;
use axum::routing::get;
use sqlx::postgres::PgPoolOptions;
use tokio::net::TcpListener;
use repository::repository::PostgresRepository;
use crate::state::AppState;

#[tokio::main]
async fn main() {
    println!("Starting server");

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

    let state = AppState {
        repository: Arc::new(repository),
    };

    let app = Router::new()
        .nest("/records", routes::record::router())
        .with_state(state);

    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}

async fn handler() -> Html<&'static str> {
    Html("<h1>Hello, World!</h1>")
}