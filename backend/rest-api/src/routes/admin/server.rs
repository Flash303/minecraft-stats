use axum::routing::delete;
use axum::{extract::{rejection::{PathRejection, QueryRejection}, Path, Query, State}, routing::{post, patch}, Router, Json};
use reqwest::StatusCode;
use serde::Deserialize;

use crate::{error::AppError, response::ResponseFormat, state::AppState};
use crate::error::AppError::ServerNotFound;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/servers/{id}", post(update_server_status))
        .route("/servers/{id}", delete(delete_server))
        .route("/servers/{id}/favicon", patch(update_server_favicon))
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
        server.favicon_hash = repository::duplicate_detection::DuplicateDetectionService::hash_favicon(server.last_favicon.as_deref());
        server.forced_favicon = true;
    } else {
        server.favicon_hash = None;
        server.forced_favicon = false;
    }

    state.repository.update_server(&server).await?;

    Ok(ResponseFormat::success((), StatusCode::OK))
}