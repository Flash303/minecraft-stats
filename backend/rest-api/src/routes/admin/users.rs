use axum::{Router, routing::get, extract::State, http::StatusCode};

use crate::{
    clerk::model::ClerkUser,
    error::AppError,
    response::ResponseFormat,
    state::AppState,
    services::clerk_service,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users))
        .route("/", get(are_admin))
}

async fn list_users(State(state): State<AppState>) -> Result<ResponseFormat<Vec<ClerkUser>>, AppError> {
    let users = clerk_service::get_all_clerk_users(&state).await?;
    Ok(ResponseFormat::success(users, StatusCode::OK))
}

async fn are_admin() -> Result<ResponseFormat<()>, AppError> {
    Ok(ResponseFormat::success((), StatusCode::OK))
}
