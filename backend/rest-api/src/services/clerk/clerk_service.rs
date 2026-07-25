use std::{sync::Arc, time::Duration};
use reqwest::Method;

use crate::{error::AppError, state::AppState};
use crate::services::clerk::model::ClerkUser;

const USER_CACHE_TTL: Duration = Duration::from_hours(2);

pub async fn get_clerk_user_with_cache(state: &AppState, user_id: &String) -> Result<Arc<ClerkUser>, AppError> {
    let cahed_user = state.user_cache.get(&user_id).await;
    if let Some(user) = cahed_user {
        return Ok(user.clone());
    }

    get_clerk_user(state, user_id).await
}

pub async fn get_clerk_user(state: &AppState, user_id: &String) -> Result<Arc<ClerkUser>, AppError> {
    let token = state.clerk_secret_key.as_deref().ok_or(AppError::FeatureDisabledError)?;
    let client = reqwest::Client::new();

    let user = client.request(Method::GET, format!("https://api.clerk.com/v1/users/{user_id}"))
        .bearer_auth(token)
        .send()
        .await?
        .json::<ClerkUser>()
        .await?;

    let cached_user = Arc::new(user);
    state.user_cache.insert(user_id.clone(), cached_user.clone(), USER_CACHE_TTL).await;

    Ok(cached_user)
}

pub async fn get_all_clerk_users(state: &AppState) -> Result<Vec<ClerkUser>, AppError> {
    let token = state.clerk_secret_key.as_deref().ok_or(AppError::FeatureDisabledError)?;
    let client = reqwest::Client::new();

    let users = client.request(Method::GET,"https://api.clerk.com/v1/users")
        .bearer_auth(token)
        .send()
        .await?
        .json::<Vec<ClerkUser>>()
        .await?;

    Ok(users)
}
