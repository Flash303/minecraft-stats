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
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    let mut server = state.repository.get_server(id).await.map_err(|e| AppError::ServerNotFoundError(e))?;

    let is_owner = server.user_id == account.sub;
    if !is_owner && !account.is_admin() {
        return Err(AppError::AuthenticationError("Forbidden".to_string()));
    }

    server.name = payload.name;
    state.repository.update_server(&server).await.map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success(server, StatusCode::OK))
}