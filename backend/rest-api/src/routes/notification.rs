use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use crate::services::clerk::model::ClerkClaims;
use axum::extract::State;
use axum::http::StatusCode;
use axum::routing::{get, post};
use axum::{Extension, Json, Router};
use repository::models::web_push::{WebPushSubscription, DraftWebPushSubscription};
use serde::{Deserialize, Serialize};
use std::env;
use repository::models::alert::Alert;

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/vapid-key", get(get_vapid_key))
        .route("/subscribe", post(subscribe_device))
        .route("/unsubscribe", post(unsubscribe_device))
        .route("/list", get(list_alerts))
}

async fn list_alerts(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
) -> Result<ResponseFormat<Vec<Alert>>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;

    let alerts = state.repository.list_alerts_for_user(account.id().clone()).await?;

    let user_alerts: Vec<Alert> = alerts
        .into_iter()
        .filter(|a| a.user_id.eq(account.id())) // Security
        .collect();

    Ok(ResponseFormat::success(user_alerts, StatusCode::OK))
}

#[derive(Serialize)]
struct VapidKeyResponse {
    pub public_key: String,
}

async fn get_vapid_key() -> Result<ResponseFormat<VapidKeyResponse>, AppError> {
    let public_key = env::var("VAPID_PUBLIC_KEY")
        .unwrap_or_else(|_| "Please set VAPID_PUBLIC_KEY in env".to_string());
    Ok(ResponseFormat::success(VapidKeyResponse { public_key }, StatusCode::OK))
}

#[derive(Deserialize)]
struct SubscribePayload {
    pub endpoint: String,
    pub p256dh: String,
    pub auth: String,
}

async fn subscribe_device(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Json(payload): Json<SubscribePayload>,
) -> Result<ResponseFormat<WebPushSubscription>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;

    let draft = DraftWebPushSubscription {
        user_id: account.sub.clone(),
        endpoint: payload.endpoint,
        p256dh: payload.p256dh,
        auth: payload.auth,
    };

    let subscription = state.repository.create_subscription(draft).await?;
    Ok(ResponseFormat::success(subscription, StatusCode::CREATED))
}

#[derive(Deserialize)]
struct UnsubscribePayload {
    pub endpoint: String,
}

async fn unsubscribe_device(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Json(payload): Json<UnsubscribePayload>,
) -> Result<ResponseFormat<()>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;

    state.repository.delete_subscription(&payload.endpoint, &account.sub).await?;
    Ok(ResponseFormat::success((), StatusCode::NO_CONTENT))
}
