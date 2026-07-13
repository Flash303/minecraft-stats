use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{include_stats, BiggerServerResponse, ServerListQueryParams};
use crate::services::clerk::model::{ClerkClaims, ClerkUser};
use crate::state::AppState;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Extension;
use futures::{stream, StreamExt};
use log::info;
use crate::services::clerk::clerk_service::{get_clerk_user_with_cache};

pub(super) async fn list_all_servers(State(state): State<AppState>,
                                     Query(query): Query<ServerListQueryParams>,
                                     Extension(user): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    let do_include_stats = query.include_stats.unwrap_or(false);

    let server_list = state.repository.list_servers().await;
    if let Err(error) = server_list {
        info!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let is_admin = user.is_some_and(|u| u.is_admin());
    let mut servers: Vec<BiggerServerResponse> = stream::iter(server_list.unwrap()
            .into_iter()
            .filter(|s| is_admin || !s.hidden))
        .map(async |server| {
            let mut server_creator: Option<ClerkUser> = None;
            if query.include_owners.is_some_and(|t| t) {
                server_creator = get_clerk_user_with_cache(&state, &server.user_id).await
                    .ok()
                    .map(|u| (*u).clone());
            }

            BiggerServerResponse::from_with_user(server.into(), server_creator)
        })
        .buffered(5)
        .collect()
        .await;

    include_stats(do_include_stats, &state, &mut servers).await?;

    Ok(ResponseFormat::success(servers, StatusCode::OK))
}