use axum::extract::{Path, State};
use axum::response::IntoResponse;
use base64::Engine;
use crate::error::AppError;
use crate::state::AppState;

pub(super) async fn get_server_icon(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    let server = state.repository.get_server(id).await.map_err(|e| AppError::ServerNotFoundError(e))?;

    if let Some(favicon) = server.last_favicon {
        if let Some(base64_data) = favicon.strip_prefix("data:image/png;base64,") {
            if let Ok(image_bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                return Ok((
                    [(axum::http::header::CONTENT_TYPE, "image/png"), (axum::http::header::CACHE_CONTROL, "public, max-age=86400")],
                    image_bytes
                ).into_response());
            }
        }
    }

    Ok(axum::response::Redirect::temporary("https://wd40.theking90000.be/files/ee292f4a-dfff-4c5f-b65e-1beca56ec24f").into_response())
}
