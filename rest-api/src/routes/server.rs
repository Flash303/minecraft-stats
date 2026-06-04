use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::Router;
use axum::routing::get;
use repository::models::server::Server;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_all_servers))
        .route("/{id}", get(get_server))
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
                        Path(id): Path<u32>) -> Result<ResponseFormat<Server>, AppError> {
    let result = state.repository.get_server(id).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(result.unwrap(), StatusCode::OK))
}