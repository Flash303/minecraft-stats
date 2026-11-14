use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;
use crate::utils::deduplicate::deduplicate;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::{Extension, Json};
use repository::models::server::{Server, ServerCategory, ServerLanguage};
use serde::Deserialize;

#[derive(Deserialize)]
pub(super) struct UpdateServerPayload {
    name: Option<String>,
    categories: Option<Vec<ServerCategory>>,
    languages: Option<Vec<ServerLanguage>>,
}

pub(super) async fn update_server(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateServerPayload>,
) -> Result<ResponseFormat<Server>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;

    let server = state
        .repository
        .get_server_without_favicon(id)
        .await?
        .ok_or(AppError::ServerNotFound)?;

    let is_owner = server.user_id == account.sub;
    if !is_owner && !account.is_admin() {
        return Err(AppError::Authentication);
    }

    let server = state
        .repository
        .update_server_details(
            id,
            payload.name.as_deref(),
            payload.categories.map(deduplicate),
            payload.languages.map(deduplicate),
        )
        .await?;

    Ok(ResponseFormat::success(server, StatusCode::OK))
}
