use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use axum::extract::{Path, Query, State};
use axum::extract::rejection::{PathRejection, QueryRejection};
use axum::http::{StatusCode};
use axum::routing::get;
use axum::Router;
use repository::models::record::Record;
use serde::{Deserialize};
use time::{Duration, OffsetDateTime};
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;

pub fn router() -> Router<AppState> {
    let rate_limit_config = GovernorConfigBuilder::default()
        .per_second(60)
        .burst_size(60)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    Router::new()
        .route("/{id}", get(fetch_records)/*.route_layer(GovernorLayer::new(rate_limit_config))*/)
}

#[derive(Deserialize)]
pub struct GetParam {
    #[serde(with = "time::serde::timestamp")]
    pub from: OffsetDateTime,
    #[serde(with = "time::serde::timestamp::option", default)]
    pub to: Option<OffsetDateTime>,
    pub interval: i64,
}

pub async fn fetch_records(State(state): State<AppState>,
                     id: Result<Path<u32>, PathRejection>,
                     query: Result<Query<GetParam>, QueryRejection>) -> Result<ResponseFormat<Vec<Record>>, AppError> {
    if let Err(error) = id {
        return Err(AppError::InvalidParamError(error.to_string()));
    }
    let id = *id.unwrap();

    if let Err(error) = query {
        return Err(AppError::InvalidQueryError(error.to_string()));
    }
    let query = query.unwrap();

    let result = state.repository.get_pings(id, query.from, query.to, Duration::milliseconds(query.interval)).await;
    if let Err(error) = result {
        return Err(AppError::FetchingDataError(error));
    }

    Ok(ResponseFormat::success(result.unwrap(), StatusCode::ACCEPTED))
}
