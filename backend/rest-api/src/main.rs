pub mod error;
pub mod state;
pub mod routes;
pub mod response;
pub mod middleware;
pub mod clerk;

use crate::clerk::account_checker::fetch_clerk_jwks;
use crate::middleware::auth::auth_middleware;
use crate::state::AppState;
use axum::http::Method;
use axum::middleware::from_fn_with_state;
use axum::Router;
use std::env;
use std::sync::Arc;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use repository::postgres::PostgresRepository;

#[tokio::main]
async fn main() {
    println!("Starting server");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| {
            println!("Please set the DATABASE_URL environment variable, using defaults.");
            "postgres://anuser:password@localhost:5432/minecraft-stats".to_string()
        });

    let result = PostgresRepository::from_url(database_url).await;
    if let Err(err) = result {
        println!("Error on database init: {}", err);
        return;
    }
    let repository = result.unwrap();

    let clerk_instance = env::var("CLERK_URL");
    if let Err(_) = clerk_instance {
        println!("Please provide a CLERK_URL environment variable.");
        return;
    }
    let clerk_instance = clerk_instance.unwrap();

    let result = fetch_clerk_jwks(format!("{}/.well-known/jwks.json", clerk_instance).as_str()).await;
    if let Err(err) = result {
        println!("Error on clerk init: {}", err);
        return;
    }
    let keys = result.unwrap();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let state = AppState {
        repository: Arc::new(repository),
        jwks: Arc::new(keys),
        clerk_instance_url: Arc::new(clerk_instance),
    };

    let app = Router::new()
        .nest("/records", routes::record::router())
        .nest("/servers", routes::server::router())
        .route_layer(from_fn_with_state(state.clone(), auth_middleware))
        .with_state(state)
        .layer(cors);

    let listener = TcpListener::bind("127.0.0.1:3000").await.unwrap();

    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app).await.unwrap();
}