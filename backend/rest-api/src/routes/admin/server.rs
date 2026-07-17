use axum::routing::delete;
use axum::{extract::{rejection::{PathRejection, QueryRejection}, Path, Query, State}, routing::post, Router};
use reqwest::StatusCode;
use serde::Deserialize;

use crate::{error::AppError, response::ResponseFormat, state::AppState};

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

    let server = state.repository.get_server(*id).await;
    if let Err(err) = server {
        return Err(AppError::ServerNotFoundError(err))
    }

    let mut server = server.unwrap();
    server.hidden = query.hidden;
    let rs = state.repository.update_server(&server).await;
    if let Err(err) = rs {
        return Err(AppError::FetchingDataError(err));
    }

    Ok(ResponseFormat::success((), StatusCode::OK))
}

async fn delete_server(State(state): State<AppState>,
                       id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<()>, AppError> {
    let id = id?;

    if let Err(err) = state.repository.delete_server(*id).await {
        return Err(AppError::FetchingDataError(err));
    }

    Ok(ResponseFormat::success((), StatusCode::OK))
}