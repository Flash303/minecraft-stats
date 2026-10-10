use axum::extract::{Path, State};
use axum::http::header::{CACHE_CONTROL, CONTENT_TYPE};
use axum::response::IntoResponse;
use base64::Engine;
use base64::prelude::BASE64_STANDARD;
use crate::error::AppError;
use crate::state::AppState;

const DEFAULT_ICON: &[u8] = include_bytes!("../../../assets/default_favicon.webp");
const DEFAULT_ICON_CACHE: &str = "public, max-age=31536000, immutable";

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

    Ok((
        [(CONTENT_TYPE, "image/webp"), (CACHE_CONTROL, DEFAULT_ICON_CACHE)],
        DEFAULT_ICON
    ).into_response())
}