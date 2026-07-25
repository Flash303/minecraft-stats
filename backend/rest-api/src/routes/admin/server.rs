use axum::routing::delete;
use axum::{extract::{rejection::{PathRejection, QueryRejection}, Path, Query, State}, routing::post, Router};
use reqwest::StatusCode;
use serde::Deserialize;

use crate::{error::AppError, response::ResponseFormat, state::AppState};
use crate::error::AppError::ServerNotFoundError;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/servers/{id}", post(update_server_status))
        .route("/servers/{id}", delete(delete_server))
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

    let mut server = state.repository.get_server(*id).await?.ok_or(ServerNotFoundError)?;
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