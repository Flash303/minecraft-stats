use std::time::Duration;
use axum::routing::delete;
use axum::{extract::{rejection::{PathRejection, QueryRejection}, Path, Query, State}, routing::{post, patch}, Router, Json};
use minecraft_pinger::config::PingConfig;
use reqwest::StatusCode;
use serde::Deserialize;
use repository::duplicate_detection::DuplicateDetectionService;
use repository::models::server::ServerType;
use crate::{error::AppError, response::ResponseFormat, state::AppState};
use crate::error::AppError::ServerNotFound;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/servers/{id}", post(update_server_status))
        .route("/servers/{id}", delete(delete_server))
        .route("/servers/{id}/favicon", patch(update_server_favicon))
        .route("/servers/{id}/ping-ip", post(ping_server_ip))
        .route("/servers/{id}/ip", patch(update_server_ip))
}

#[derive(Deserialize)]
struct QueryParam {
    hidden: bool
}

async fn update_server_status(State(state): State<AppState>,
                            id: Result<Path<u32>, PathRejection>,
                            query: Result<Query<QueryParam>, QueryRejection>) -> Result<ResponseFormat<()>, AppError> {
    let query = query?;
    let id = id?;

    let mut server = state.repository.get_server(*id).await?.ok_or(ServerNotFound)?;
    server.hidden = query.hidden;

    state.repository.update_server(&server).await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}

async fn delete_server(State(state): State<AppState>,
                       id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<()>, AppError> {
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
    let mut server = state.repository.get_server(*id).await?.ok_or(ServerNotFound)?;

    server.last_favicon = payload.favicon;
    
    if server.last_favicon.is_some() {
        server.favicon_hash = DuplicateDetectionService::hash_favicon(server.last_favicon.as_deref());
        server.forced_favicon = true;
    } else {
        server.favicon_hash = None;
        server.forced_favicon = false;
    }

    state.repository.update_server(&server).await?;

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
}

async fn ping_server_ip(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateIpPayload>,
) -> Result<ResponseFormat<PingIpResponse>, AppError> {
    let id = id?;
    let server = state.repository.get_server(*id).await?.ok_or(ServerNotFound)?;

    let cfg = PingConfig::builder()
        .set_timeout(Duration::from_secs(2))
        .build();

    let mut is_reachable = false;
    let mut motd = None;
    let mut version = None;
    let mut favicon = None;

    for _ in 0..2 {
        let ping_res = match server.server_type {
            ServerType::Java => {
                let res = state.pinger.ping_java_server(payload.ip.as_str(), payload.port, &cfg).await;
                if let Ok(ping) = &res {
                    motd = serde_json::to_value(&ping.description).ok();
                    version = Some(ping.version.name.clone());
                    favicon = ping.favicon.clone();
                }
                res.is_ok()
            },
            ServerType::Bedrock => {
                let res = state.pinger.ping_bedrock_server(payload.ip.as_str(), payload.port, &cfg).await;
                if let Ok(ping) = &res {
                    motd = serde_json::to_value(&ping.motd).ok();
                    version = Some(ping.version.clone());
                }
                res.is_ok()
            }
        };

        if ping_res {
            is_reachable = true;
            break;
        }
    }

    Ok(ResponseFormat::success(PingIpResponse {
        is_reachable,
        motd,
        version,
        favicon
    }, StatusCode::OK))
}

async fn update_server_ip(
    State(state): State<AppState>,
    id: Result<Path<u32>, PathRejection>,
    Json(payload): Json<UpdateIpPayload>,
) -> Result<ResponseFormat<()>, AppError> {
    let id = id?;
    let mut server = state.repository.get_server(*id).await?.ok_or(ServerNotFound)?;

    let resolved_endpoint = DuplicateDetectionService::resolve_endpoint(payload.ip.as_str(), payload.port).await;

    server.ip = payload.ip;
    server.port = payload.port;
    server.resolved_endpoint = resolved_endpoint;

    state.repository.update_server(&server).await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}