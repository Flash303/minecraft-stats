use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::{IntoResponse, Redirect};
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use crate::error::AppError;
use crate::state::AppState;

pub(super) async fn get_server_icon(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> Result<impl IntoResponse, AppError> {
    let server = state.repository.get_server(id).await?
        .ok_or(AppError::ServerNotFound)?;

    if let Some(favicon) = server.last_favicon && let Some(base64_data) = favicon.strip_prefix("data:image/png;base64,") {
        if let Ok(image_bytes) = BASE64_STANDARD.decode(base64_data) {
            return Ok((
                [(CONTENT_TYPE, "image/png"), (CACHE_CONTROL, "public, max-age=86400")],
                image_bytes
            ).into_response());
        }
    }

    Ok(Redirect::temporary("https://wd40.theking90000.be/files/ee292f4a-dfff-4c5f-b65e-1beca56ec24f").into_response())
}
