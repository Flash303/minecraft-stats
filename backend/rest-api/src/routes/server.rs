use crate::clerk::account_checker::ClerkClaims;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use axum::extract::rejection::{JsonRejection, PathRejection};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
use repository::models::server::{Server, UnregisteredServer};
use repository::duplicate_detection::DuplicateDetectionService;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_all_servers))
        .route("/{id}", get(get_server))
        .route("/", post(create_server))
}

pub async fn list_all_servers(State(state): State<AppState>) -> Result<ResponseFormat<Vec<Server>>, AppError> {
    let server_list = state.repository.list_servers().await;
    if let Err(error) = server_list {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(server_list.unwrap(), StatusCode::OK))
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
        if let Ok(res) = pinger::ping_server(query.ip.as_str(), query.port).await {
            ping_result = Some(res);
            break;
        }
    }
    
    let ping = ping_result.ok_or_else(|| AppError::ServerCreationError("Server not reachable".to_string()))?;

    // Compute hashes
    query.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
    
    // Convert Description to Value for hash_motd
    let motd_value = serde_json::to_value(&ping.description).ok();
    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
    
    query.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(query.ip.as_str(), query.port).await;

    // Check for duplicates
    let existing = state.repository.find_servers(
        query.favicon_hash.as_deref(),
        query.resolved_endpoint.as_deref(),
        query.motd_hash.as_deref()
    ).await.map_err(|e| AppError::ServerCreationError(e))?;
    
    if !existing.is_empty() {
        return Err(AppError::ServerCreationError("Server already exists".to_string()));
    }
    
    query.user_id = Some(account.unwrap().sub);

    let rs = state.repository.create_server(query).await;
    if let Err(error) = rs {
        println!("Error creating server: {:?}", error);
        return Err(AppError::ServerCreationError(error));
    }

    Ok(ResponseFormat::success(rs.unwrap(), StatusCode::OK))
}