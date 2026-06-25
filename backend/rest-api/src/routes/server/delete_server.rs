use axum::Extension;
use axum::extract::{Path, State};
use axum::http::StatusCode;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

pub(super) async fn delete_alert(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(alert_id): Path<u32>,
) -> Result<ResponseFormat<()>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    state.repository.delete_alert(alert_id, account.sub.clone()).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success((), StatusCode::NO_CONTENT))
}