use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{BiggerServerResponse, ServerListQueryParams, include_stats};
use crate::services::clerk::clerk_service;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;
use axum::Extension;
use axum::extract::rejection::PathRejection;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use futures::{StreamExt, stream};
pub(super) async fn get_mine_server(State(state): State<AppState>,
                                    Query(query): Query<ServerListQueryParams>,
                                    Extension(account): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;
    let do_include_stats = query.include_stats.unwrap_or(false);

    let result = state.repository.get_servers_of_user_without_favicon(account.id().clone()).await?;
    let mut servers = stream::iter(result.into_iter()
        .filter(|s| account.is_admin() || !s.hidden))
        .map(async |s| BiggerServerResponse::from(&state, s).await)
        .buffered(5)
        .collect()
        .await;

    include_stats(do_include_stats, &state, &mut servers).await?;

    Ok(ResponseFormat::success(servers, StatusCode::OK))
}

pub(super) async fn get_server(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<BiggerServerResponse>, AppError> {
    let server = state.repository.get_server_without_favicon(*id?).await?
        .ok_or(AppError::ServerNotFound)?;

    let is_admin = account.is_some_and(|u| u.is_admin());
    if server.hidden && !is_admin {
        return Err(AppError::ServerNotFound);
    }

    let user = clerk_service::get_clerk_user_with_cache(&state, &server.user_id)
        .await
        .ok();

    Ok(ResponseFormat::success(BiggerServerResponse::from_user(&state, server, user).await, StatusCode::OK))
}