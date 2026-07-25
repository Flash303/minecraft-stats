use axum::{Extension, Json};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use repository::models::server::Server;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

#[derive(Deserialize)]
pub(super) struct UpdateServerPayload {
    name: String,
}

pub(super) async fn update_server_name(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateServerPayload>,
) -> Result<ResponseFormat<Server>, AppError> {
    let account = account.ok_or(AppError::AuthenticationError)?;

    let mut server = state.repository.get_server(id).await?.ok_or(AppError::ServerNotFoundError)?;

    let is_owner = server.user_id == account.sub;
    if !is_owner && !account.is_admin() {
        return Err(AppError::AuthenticationError);
    }

    server.name = payload.name;
    state.repository.update_server(&server).await?;

    Ok(ResponseFormat::success(server, StatusCode::OK))
}