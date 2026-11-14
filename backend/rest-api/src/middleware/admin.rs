use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode, header::AUTHORIZATION},
    middleware::Next,
    response::{IntoResponse, Response},
};

use crate::error::AppError;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

pub async fn admin_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    if let Some(configured) = state.admin_api_key.as_ref().as_deref()
        && !configured.is_empty()
    {
        let header_match = req
            .headers()
            .get("x-admin-key")
            .and_then(|v| v.to_str().ok())
            .is_some_and(|provided| provided == configured);
        let bearer_match = req
            .headers()
            .get(AUTHORIZATION)
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .is_some_and(|provided| provided == configured);
        if header_match || bearer_match {
            return Ok(next.run(req).await);
        }
    }

    let account = req
        .extensions()
        .get::<Option<ClerkClaims>>()
        .cloned()
        .flatten();
    let administrator = match account {
        Some(account) => account.is_admin.unwrap_or(false),
        None => false,
    };

    if !administrator {
        return Ok(AppError::Authentication.into_response());
    }

    Ok(next.run(req).await)
}
