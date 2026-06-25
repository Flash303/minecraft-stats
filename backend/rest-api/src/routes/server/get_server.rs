use axum::Extension;
use axum::extract::{Path, Query, State};
use axum::extract::rejection::PathRejection;
use axum::http::StatusCode;
use serde::Serialize;
use repository::models::server::Server;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{BiggerServerResponse, QueryParams};
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
                         Query(query): Query<QueryParams>,
                         Extension(account): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }
    let account = account.unwrap();
    let include_stats = query.include_stats.unwrap_or(false);

    let result = state.repository.get_servers_of_user(account.id().clone()).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let mut servers: Vec<BiggerServerResponse> = result.unwrap()
        .into_iter()
        .filter(|s| account.is_admin() || !s.hidden)
        .map(BiggerServerResponse::from)
        .collect();

    if include_stats {
        let server_ids: Vec<u32> = servers.iter().map(|s| s.server.id).collect();

        let records_result = state.repository.get_last_pings_for_servers(&server_ids).await;
        if let Err(error) = records_result {
            println!("Error fetching last pings for servers: {:?}", error);
            return Err(AppError::FetchingDataError(error));
        }

        let mut records_map = records_result.unwrap();
        for s in &mut servers {
            s.data = records_map.remove(&s.server.id);
        }
    }

    Ok(ResponseFormat::success(servers, StatusCode::OK))
}

pub(super) async fn get_server(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<ServerWithUser>, AppError> {
    if let Err(error) = id {
        return Err(AppError::InvalidParamError(error.to_string()));
    }

    let result = state.repository.get_server(*id.unwrap()).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
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