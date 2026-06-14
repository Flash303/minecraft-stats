use axum::{Router, extract::{Path, Query, State, rejection::{PathRejection, QueryRejection}}, routing::post};
use reqwest::StatusCode;
use serde::Deserialize;

use crate::{error::AppError, response::ResponseFormat, state::AppState};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/servers/{id}", post(update_server_status))
}


#[derive(Deserialize)]
struct QueryParam {
    hidden: bool
}

async fn update_server_status(State(state): State<AppState>,
                            id: Result<Path<u32>, PathRejection>,
                            query: Result<Query<QueryParam>, QueryRejection>,) -> Result<ResponseFormat<()>, AppError> {
    if let Err(err) = query {
        return Err(AppError::InvalidQueryError(err.to_string()))
    }
    let query = query.unwrap();

    if let Err(err) = id {
        return Err(AppError::InvalidParamError(err.to_string()))
    }
    let id = id.unwrap();

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
