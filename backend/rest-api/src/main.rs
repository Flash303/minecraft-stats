pub mod error;
pub mod state;
pub mod routes;
pub mod response;
pub mod middleware;
pub mod clerk;
pub mod services;
pub mod utils;

use crate::clerk::account_checker::fetch_clerk_jwks;
use crate::middleware::auth::auth_middleware;
use crate::routes::admin;
use crate::state::AppState;
use crate::utils::cache::TtlCache;
use axum::{extract::DefaultBodyLimit, http::Method};
use axum::middleware::from_fn_with_state;
use axum::Router;
use tower_http::compression::CompressionLayer;
use std::env;
use std::net::SocketAddr;
use std::sync::Arc;
use minecraft_pinger::MinecraftPinger;
use tokio::net::TcpListener;
use tower_http::cors::{Any, CorsLayer};
use repository::postgres::PostgresRepository;

const DEFAULT_PORT: u16 = 3000;

#[tokio::main]
async fn main() {
    println!("Starting server");

    // Port
    let port = env::var("LISTEN_PORT")
        .map(|p| p.parse::<u16>().unwrap_or(DEFAULT_PORT))
        .unwrap_or_else(|_| {
            println!("Please set the LISTEN_PORT environment variable, using defaults.");
            DEFAULT_PORT
        });
        

    // Init DB
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
    

    // Init clerk - Auth
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
    

    // Init clerk - API
    let clerk_secret_key = env::var("CLERK_SECRET_KEY");
    if let Err(_) = clerk_secret_key {
        println!("Please provide a CLERK_SECRET_KEY environment variable, some functionality may not work as expected.");
    }
    let clerk_secret_key: Option<String> = clerk_secret_key.ok().map(|s| s.into());


    // Init Pinger (for server add)
    let pinger = MinecraftPinger::new();
    if let Err(err) = pinger {
        println!("Error on pinger init: {}", err);
        return;
    }
    let pinger = pinger.unwrap();


    // Init the main rest api
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers(Any);

    let body_limit = DefaultBodyLimit::max(1024 * 10);

    let state = AppState {
        repository: Arc::new(repository),
        pigner: Arc::new(pinger),

        jwks: Arc::new(keys),
        clerk_instance_url: Arc::new(clerk_instance),

        clerk_secret_key: Arc::new(clerk_secret_key),
        user_cache: TtlCache::new(),
    };

    let app = Router::new()
        .nest("/records", routes::record::router())
        .nest("/servers", routes::server::router())
        .nest("/admin", admin::routes::router(state.clone()))
        .route_layer(from_fn_with_state(state.clone(), auth_middleware))
        .with_state(state)
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(body_limit);

    let listener = TcpListener::bind(format!("0.0.0.0:{}", port)).await.unwrap();

    println!("Listening on {}", listener.local_addr().unwrap());
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>()).await.unwrap();
}
