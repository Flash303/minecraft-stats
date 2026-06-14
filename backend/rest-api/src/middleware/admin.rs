use axum::{
    body::Body, extract::State, http::{Request, StatusCode}, middleware::Next, response::{IntoResponse, Response}
};

use crate::{clerk::model::{ClerkClaims}, error::AppError, state::AppState};

pub async fn admin_middleware(
    State(state): State<AppState>,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let account = req.extensions().get::<Option<ClerkClaims>>().cloned().flatten();
    let administrator = match account
    {
        Some(account) => {
            println!("Found and account");
            state.repository.is_admin(account.id().clone()).await.ok().unwrap_or(false)
        }
        None => {
            println!("no account found");
            false
        },
    };

    if !administrator {
        return Ok(AppError::AuthenticationError("Admin authorisation required".to_string()).into_response())
    }

    Ok(next.run(req).await)
}
