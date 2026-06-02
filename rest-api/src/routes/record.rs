use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::get;
use axum::Router;
use serde::{Deserialize, Serialize};
use time::{Duration, OffsetDateTime};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/{id}", get(fetch_records))
}

#[derive(Deserialize)]
pub struct GetParam {
    #[serde(with = "time::serde::timestamp")]
    pub from: OffsetDateTime,
    #[serde(with = "time::serde::timestamp::option", default)]
    pub to: Option<OffsetDateTime>,
    pub interval: i64,
}

#[derive(Serialize)]
pub struct RecordResponse {
    #[serde(with = "time::serde::timestamp")]
    pub date: OffsetDateTime,
    pub value: u32,
}

pub async fn fetch_records(State(state): State<AppState>,
                     Path(id): Path<u32>,
                     Query(query): Query<GetParam>) -> Result<ResponseFormat<Vec<RecordResponse>>, AppError> {
    let result = state.repository.get_pings(id, query.from, query.to, Duration::milliseconds(query.interval)).await;
    if let Err(error) = result {
        return Err(AppError::FetchingDataError(error));
    }

    let data: Vec<RecordResponse> = result.unwrap()
        .into_iter()
        .map(|r| RecordResponse {
            date: r.date,
            value: r.value,
        })
        .collect();

    Ok(ResponseFormat::success(data, StatusCode::ACCEPTED))
}