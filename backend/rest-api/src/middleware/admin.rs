use axum::{
    body::Body, http::{Request, StatusCode}, middleware::Next, response::{IntoResponse, Response}
};

use crate::error::AppError;
use crate::services::clerk::model::ClerkClaims;

pub async fn admin_middleware(
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let account = req.extensions().get::<Option<ClerkClaims>>().cloned().flatten();
    let administrator = match account {
        Some(account) => account.is_admin.unwrap_or(false),
        None => false,
    };

    if !administrator {
        return Ok(AppError::AuthenticationError("Admin authorisation required".to_string()).into_response())
    }

    Ok(next.run(req).await)
}
