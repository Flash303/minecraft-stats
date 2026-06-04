pub mod error;
pub mod state;
pub mod routes;
pub mod response;

use crate::state::AppState;
use axum::http::Method;
use axum::Router;
use repository::repository::PostgresRepository;
use std::env;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    println!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://anuser:password@localhost:5432/minecraft-stats".to_string());

    let repository = PostgresRepository::from_url(database_url).await.unwrap();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let state = AppState {
        repository: Arc::new(repository),
    };

    let app = Router::new()
        .nest("/records", routes::record::router())
        .nest("/servers", routes::server::router())
        .with_state(state)
        .layer(cors);

    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    println!("listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}