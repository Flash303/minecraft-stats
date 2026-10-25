use crate::error::AppError::ServerNotFound;
use crate::{error::AppError, response::ResponseFormat, state::AppState};
use axum::routing::delete;
use axum::{
    Json, Router,
    extract::{
        Path, Query, State,
        rejection::{PathRejection, QueryRejection},
    },
    routing::{patch, post},
};
use minecraft_pinger::config::PingConfig;
use minecraft_pinger::error::PingError;
use minecraft_pinger::java::config::JavaPingConfig;
use repository::duplicate_detection::DuplicateDetectionService;
use repository::models::server::ServerType;
use reqwest::StatusCode;
use serde::Deserialize;
use std::time::Duration;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/servers/{id}", post(update_server_status))
        .route("/servers/{id}", delete(delete_server))
        .route("/servers/{id}/favicon", patch(update_server_favicon))
        .route("/servers/{id}/ping-ip", post(ping_server_ip))
        .route("/servers/{id}/ip", patch(update_server_ip))
        .route("/servers/{id}/owner", patch(update_server_owner))
}

#[derive(Deserialize)]
struct QueryParam {
    hidden: bool,
}

async fn update_server_status(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    query: Result<Query<QueryParam>, QueryRejection>,
) -> Result<ResponseFormat<()>, AppError> {
    let query = query?;
    let id = id?;

    state
        .repository
        .get_server_without_favicon(*id)
        .await?
        .ok_or(ServerNotFound)?;

    state
        .repository
        .set_server_hidden(*id, query.hidden)
        .await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}

async fn delete_server(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
) -> Result<ResponseFormat<()>, AppError> {
    let id = id?;
    state.repository.delete_server(*id).await?;
    Ok(ResponseFormat::success((), StatusCode::OK))
}

#[derive(Deserialize)]
struct UpdateFaviconPayload {
    favicon: Option<String>,
}

async fn update_server_favicon(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateFaviconPayload>,
) -> Result<ResponseFormat<()>, AppError> {
    let id = id?;
    state
        .repository
        .get_server_without_favicon(*id)
        .await?
        .ok_or(ServerNotFound)?;

    let (favicon, favicon_hash, forced_favicon) = match payload.favicon {
        Some(favicon) => {
            let hash = DuplicateDetectionService::hash_favicon(Some(favicon.as_str()));
            (Some(favicon), hash, true)
        }
        None => (None, None, false),
    };

    state
        .repository
        .set_server_favicon(
            *id,
            favicon.as_deref(),
            favicon_hash.as_deref(),
            forced_favicon,
        )
        .await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}

#[derive(Deserialize)]
pub struct UpdateIpPayload {
    pub ip: String,
    pub port: u16,
}

#[derive(serde::Serialize)]
pub struct PingIpResponse {
    pub is_reachable: bool,
    pub motd: Option<serde_json::Value>,
    pub version: Option<String>,
    pub favicon: Option<String>,
    pub current_players: Option<i32>,
    pub max_players: Option<i32>,
}

async fn ping_server_ip(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateIpPayload>,
) -> Result<ResponseFormat<PingIpResponse>, AppError> {
    let id = id?;
    let server = state
        .repository
        .get_server_without_favicon(*id)
        .await?
        .ok_or(ServerNotFound)?;

    let cfg = PingConfig::builder()
        .set_timeout(Duration::from_secs(2))
        .deny_non_public_ips()
        .build();

    let java_cfg = JavaPingConfig::from(&cfg).build();

    let mut is_reachable = false;
    let mut motd = None;
    let mut version = None;
    let mut favicon = None;
    let mut current_players = None;
    let mut max_players = None;

    for _ in 0..2 {
        let ping_res = match server.server_type {
            ServerType::Java => {
                let res = state
                    .pinger
                    .ping_java_server(payload.ip.as_str(), payload.port, &java_cfg)
                    .await;
                if let Ok(ping) = &res {
                    motd = serde_json::to_value(&ping.description).ok();
                    version = Some(ping.version.name.clone());
                    favicon = ping.favicon.clone();
                    current_players = Some(ping.players.online);
                    max_players = Some(ping.players.max);
                }
                if let Err(PingError::BlockedEndpoint(detail)) = &res {
                    return Err(AppError::BlockedEndpoint(detail.clone()));
                }
                res.is_ok()
            }
            ServerType::Bedrock => {
                let res = state
                    .pinger
                    .ping_bedrock_server(payload.ip.as_str(), payload.port, &cfg)
                    .await;
                if let Ok(ping) = &res {
                    motd = serde_json::to_value(&ping.motd).ok();
                    version = Some(ping.version.clone());
                    current_players = Some(ping.current_players);
                    max_players = Some(ping.max_players as i32);
                }
                if let Err(PingError::BlockedEndpoint(detail)) = &res {
                    return Err(AppError::BlockedEndpoint(detail.clone()));
                }
                res.is_ok()
            }
        };

        if ping_res {
            is_reachable = true;
            break;
        }
    }

    Ok(ResponseFormat::success(
        PingIpResponse {
            is_reachable,
            motd,
            version,
            favicon,
            current_players,
            max_players,
        },
        StatusCode::OK,
    ))
}

async fn update_server_ip(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateIpPayload>,
) -> Result<ResponseFormat<()>, AppError> {
    let id = id?;
    state
        .repository
        .get_server_without_favicon(*id)
        .await?
        .ok_or(ServerNotFound)?;

    let resolved_endpoint =
        DuplicateDetectionService::resolve_endpoint(payload.ip.as_str(), payload.port).await;

    state
        .repository
        .update_server_address(*id, &payload.ip, payload.port, resolved_endpoint.as_deref())
        .await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}

#[derive(Deserialize)]
pub struct UpdateOwnerPayload {
    pub user_id: String,
}

async fn update_server_owner(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateOwnerPayload>,
) -> Result<ResponseFormat<()>, AppError> {
    use crate::error::AppError::UserNotFound;
    use crate::services::clerk::clerk_service::get_clerk_user;

    let id = id?;
    let new_owner_id = payload.user_id.trim().to_string();
    if new_owner_id.is_empty() {
        return Err(UserNotFound);
    }

    let server = state
        .repository
        .get_server_without_favicon(*id)
        .await?
        .ok_or(ServerNotFound)?;

    if server.user_id == new_owner_id {
        return Ok(ResponseFormat::success((), StatusCode::OK));
    }

    // Ensure the target user actually exists in Clerk before reassigning.
    get_clerk_user(&state, &new_owner_id)
        .await
        .map_err(|_| UserNotFound)?;

    state
        .repository
        .update_server_owner(*id, &new_owner_id)
        .await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}
