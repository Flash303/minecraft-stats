use axum::Extension;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use repository::models::alert::Alert;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

pub(super) async fn list_alerts(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(server_id): Path<u32>,
) -> Result<ResponseFormat<Vec<Alert>>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    // Verify server exists
    state.repository.get_server(server_id).await
        .map_err(|e| AppError::ServerNotFoundError(e))?;

    let alerts = state.repository.list_alerts_for_server(server_id).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    let user_alerts: Vec<Alert> = alerts
        .into_iter()
        .filter(|a| a.user_id == account.sub)
        .collect();

    Ok(ResponseFormat::success(user_alerts, StatusCode::OK))
}