use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::routes::server::router::{BiggerServerResponse, QueryParams};
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;
use axum::extract::{Query, State};
use axum::http::StatusCode;
use axum::Extension;

pub(super) async fn list_all_servers(State(state): State<AppState>,
                          Query(query): Query<QueryParams>,
                          Extension(user): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    let include_stats = query.include_stats.unwrap_or(false);

    let server_list = state.repository.list_servers().await;
    if let Err(error) = server_list {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let is_admin = user.is_some_and(|u| u.is_admin());
    let mut servers: Vec<BiggerServerResponse> = server_list.unwrap()
        .into_iter()
        .filter(|s| is_admin || !s.hidden)
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