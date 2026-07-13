use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::extract::rejection::PathRejection;
use axum::http::StatusCode;
use log::info;
use serde::Serialize;
use repository::models::server::Server;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{include_stats, BiggerServerResponse, ServerListQueryParams};
use crate::services::clerk::clerk_service;
use crate::services::clerk::model::{ClerkClaims, ClerkUser};
use crate::state::AppState;

#[derive(Serialize)]
pub(super) struct ServerWithUser {
    #[serde(flatten)]
    pub server: Server,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<ClerkUser>
}

pub(super) async fn get_mine_server(State(state): State<AppState>,
                                    Query(query): Query<ServerListQueryParams>,
                                    Extension(account): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }
    let account = account.unwrap();
    let do_include_stats = query.include_stats.unwrap_or(false);

    let result = state.repository.get_servers_of_user(account.id().clone()).await;
    if let Err(error) = result {
        info!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let mut servers: Vec<BiggerServerResponse> = result.unwrap()
        .into_iter()
        .filter(|s| account.is_admin() || !s.hidden)
        .map(BiggerServerResponse::from)
        .collect();

    include_stats(do_include_stats, &state, &mut servers).await?;

    Ok(ResponseFormat::success(servers, StatusCode::OK))
}

pub(super) async fn get_server(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<ServerWithUser>, AppError> {
    let result = state.repository.get_server(*id?).await;
    if let Err(error) = result {
        info!("Error listing servers: {:?}", error);
        return Err(AppError::ServerNotFoundError(error));
    }
    let mut server = ServerWithUser {
        server: result.unwrap(),
        user: None
    };

    let is_admin = account.is_some_and(|u| u.is_admin());
    if server.server.hidden && !is_admin {
        return Err(AppError::ServerNotFoundError("Hidden server".to_string()));
    }

    let user = clerk_service::get_clerk_user_with_cache(&state, &server.server.user_id)
        .await
        .ok();

    if let Some(clerk_user) = user {
        server.user = Some((*clerk_user).clone());
    }

    Ok(ResponseFormat::success(server, StatusCode::OK))
}