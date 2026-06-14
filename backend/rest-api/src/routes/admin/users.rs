use axum::{extract::State, http::StatusCode, routing::get, Router};

use crate::{
    error::AppError,
    response::ResponseFormat,
    state::AppState,
};
use crate::services::clerk::clerk_service;
use crate::services::clerk::model::ClerkUser;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
}

async fn list_users(State(state): State<AppState>) -> Result<ResponseFormat<Vec<ClerkUser>>, AppError> {
    let users = clerk_service::get_all_clerk_users(&state).await?;
    Ok(ResponseFormat::success(users, StatusCode::OK))
}
