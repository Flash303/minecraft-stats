use crate::services::clerk::account_checker::verify_clerk_token;
use crate::state::AppState;
use axum::http::header::AUTHORIZATION;
use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode},
    middleware::Next,
    response::Response
};

pub async fn auth_middleware(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_user = match req.headers().get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|token| token.strip_prefix("Bearer "))
    {
        Some(token) => {
            verify_clerk_token(&state, token).ok()
        }
        None => None,
    };

    req.extensions_mut().insert(auth_user);
    Ok(next.run(req).await)
}