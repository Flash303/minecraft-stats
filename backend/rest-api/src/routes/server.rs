use std::time::Duration;

use crate::clerk::account_checker::ClerkClaims;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use axum::extract::rejection::{JsonRejection, PathRejection};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
use minecraft_pinger::PingConfig;
use repository::models::server::{Server, UnregisteredServer};
use repository::duplicate_detection::{DuplicateDetectionService, ServerFingerprint};
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;

pub fn router() -> Router<AppState> {
    let get_server_limit = GovernorConfigBuilder::default()
        .per_second(5)
        .burst_size(40)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    let push_server_limit = GovernorConfigBuilder::default()
        .period(Duration::from_secs(10))
        .burst_size(3)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    let layer = GovernorLayer::new(get_server_limit);

    Router::new()
        .route("/", get(list_all_servers).route_layer(layer.clone()))
        .route("/{id}", get(get_server).route_layer(layer.clone()))
        .route("/mine", get(get_mine_server).route_layer(layer))
        .route("/", post(create_server).route_layer(GovernorLayer::new(push_server_limit)))
}

pub async fn list_all_servers(State(state): State<AppState>) -> Result<ResponseFormat<Vec<Server>>, AppError> {
    let server_list = state.repository.list_servers().await;
    if let Err(error) = server_list {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(server_list.unwrap(), StatusCode::OK))
}

pub async fn get_mine_server(State(state): State<AppState>,
                            Extension(account): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<Server>>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }

    let result = state.repository.get_servers_of_user(account.unwrap().sub).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(result.unwrap(), StatusCode::OK))
}

pub async fn get_server(State(state): State<AppState>,
                        id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<Server>, AppError> {
    if let Err(error) = id {
        return Err(AppError::InvalidParamError(error.to_string()));
    }

    let result = state.repository.get_server(*id.unwrap()).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(result.unwrap(), StatusCode::OK))
}

pub async fn create_server(State(state): State<AppState>,
                           Extension(account): Extension<Option<ClerkClaims>>,
                           query: Result<Json<UnregisteredServer>, JsonRejection>) -> Result<ResponseFormat<Server>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }

    if let Err(error) = query {
        return Err(AppError::InvalidJsonError(error.to_string()));
    }
    let mut query = query.unwrap().0;

    // max 3 try
    let mut ping_result = None;
    for _ in 0..3 {
        if let Ok(res) = state.pigner.ping_server(query.ip.as_str(), query.port, &PingConfig::default()).await {
            ping_result = Some(res);
            break;
        }
    }

    let ping = ping_result.ok_or_else(|| AppError::ServerCreationError("Server not reachable".to_string()))?;
    query.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
    let motd_value = serde_json::to_value(&ping.description).ok();
    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
    query.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(query.ip.as_str(), query.port).await;

    let fingerprint = ServerFingerprint {
        favicon_hash: query.favicon_hash.clone(),
        resolved_endpoint: query.resolved_endpoint.clone(),
        motd_hash: query.motd_hash.clone(),
        version: Some(ping.version.name.clone()),
    };

    if let Some(duplicate) = DuplicateDetectionService::find_duplicate(
        state.repository.as_ref(),
        &fingerprint,
        None,
    ).await.map_err(|e| AppError::ServerCreationError(e))? {
        println!(
            "Server name {} is similar to existing server {} (ID: {}) with score {} (signals: {:?})",
            query.name,
            duplicate.server.name,
            duplicate.server.id,
            duplicate.score,
            duplicate.signals
        );

        drop(fingerprint);
        return Err(AppError::ServerCreationError("Server already exists".to_string()));
    }
    drop(fingerprint);

    query.user_id = Some(account.unwrap().sub);

    let rs = state.repository.create_server(query).await;
    if let Err(error) = rs {
        println!("Error creating server: {:?}", error);
        return Err(AppError::ServerCreationError(error));
    }

    Ok(ResponseFormat::success(rs.unwrap(), StatusCode::OK))
}
