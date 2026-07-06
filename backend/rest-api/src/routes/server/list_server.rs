use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{include_stats, BiggerServerResponse, QueryParams};
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Extension;
use log::info;

pub(super) async fn list_all_servers(State(state): State<AppState>,
                                     Query(query): Query<QueryParams>,
                                     Extension(user): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    let do_include_stats = query.include_stats.unwrap_or(false);

    let server_list = state.repository.list_servers().await;
    if let Err(error) = server_list {
        info!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let is_admin = user.is_some_and(|u| u.is_admin());
    let mut servers: Vec<BiggerServerResponse> = server_list.unwrap()
        .into_iter()
        .filter(|s| is_admin || !s.hidden)
        .map(BiggerServerResponse::from)
        .collect();

    include_stats(do_include_stats, &state, &mut servers).await?;

    Ok(ResponseFormat::success(servers, StatusCode::OK))
}