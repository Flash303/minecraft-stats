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
    let query = query.unwrap().0;

    // max 3 try
    for i in 0..3 {
        let result = pinger::ping_server(query.ip.as_str(), query.port).await;
        if let Err(_) = result && i >= 2 {
            return Err(AppError::ServerCreationError("Server not reachable".to_string()));
        }

        if result.is_err() {
            break;
        }
    }


    let rs = state.repository.create_server(query).await;
    if let Err(error) = rs {
        println!("Error creating server: {:?}", error);
        return Err(AppError::ServerCreationError(error));
    }

    Ok(ResponseFormat::success(rs.unwrap(), StatusCode::OK))
}