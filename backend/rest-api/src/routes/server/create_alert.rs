use axum::{Extension, Json};
use axum::extract::{Path, State};
use axum::http::StatusCode;
use serde::Deserialize;
use repository::models::alert::{Alert, AlertType, DraftAlert};
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

#[derive(Deserialize)]
pub(super) struct CreateAlertPayload {
    pub alert_type: AlertType,
    pub player_threshold: Option<u32>,
    pub is_active: Option<bool>,
}

pub(super) async fn create_alert(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(server_id): Path<u32>,
    Json(payload): Json<CreateAlertPayload>,
) -> Result<ResponseFormat<Alert>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    // Verify server exists
    state.repository.get_server(server_id).await
        .map_err(|e| AppError::ServerNotFoundError(e))?;

    let draft = DraftAlert {
        user_id: account.sub.clone(),
        server_id,
        alert_type: payload.alert_type,
        player_threshold: payload.player_threshold,
        is_active: payload.is_active.unwrap_or(true),
    };

    let alert = state.repository.create_alert(draft).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success(alert, StatusCode::CREATED))
}