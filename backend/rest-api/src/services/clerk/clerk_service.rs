use std::{sync::Arc, time::Duration};
use reqwest::Method;
use serde_json::Value;
use crate::{error::AppError, state::AppState};
use crate::services::clerk::model::ClerkUser;

const USER_CACHE_TTL: Duration = Duration::from_hours(2);
const MAX_USERS_PER_PAGE: u64 = 500;

pub async fn get_clerk_user_with_cache(state: &AppState, user_id: &String) -> Result<Arc<ClerkUser>, AppError> {
    let cached_user = state.user_cache.get(&user_id).await;
    if let Some(user) = cached_user {
        return Ok(user.clone());
    }

    get_clerk_user(state, user_id).await
}

pub async fn get_clerk_user(state: &AppState, user_id: &String) -> Result<Arc<ClerkUser>, AppError> {
    let token = state.clerk_secret_key.as_deref().ok_or(AppError::FeatureDisabled)?;
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
    let token = state.clerk_secret_key.as_deref().ok_or(AppError::FeatureDisabled)?;
    let client = reqwest::Client::new();

    let user_count = client.request(Method::GET, "https://api.clerk.com/v1/users/count")
        .bearer_auth(token)
        .send()
        .await?
        .json::<Value>()
        .await?;

    let user_count = user_count.get("total_count")
        .ok_or(AppError::ClerkApiProblem("total_count not found".into()))?.as_u64()
        .ok_or(AppError::ClerkApiProblem("total_count not u64".into()))?;

    println!("User count {}", user_count);

    let mut users: Vec<ClerkUser> = Vec::with_capacity(user_count as usize);

    let nb_req = user_count / MAX_USERS_PER_PAGE;
    println!("Nb req {}", nb_req);

    for i in 0..nb_req {
        let limit = &MAX_USERS_PER_PAGE;
        let offset = i * MAX_USERS_PER_PAGE;

        println!("Limit {}, Offset {}", limit, offset);

        let fetched_users = client.request(Method::GET,format!("https://api.clerk.com/v1/users?limit={}&offset={}", limit, offset))
            .bearer_auth(token)
            .send()
            .await?
            .json::<Vec<ClerkUser>>()
            .await?;

        users.extend(fetched_users);
    }

    Ok(users)
}
