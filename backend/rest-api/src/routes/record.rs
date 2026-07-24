use crate::services::clerk::model::ClerkClaims;
use crate::error::AppError;
use crate::state::AppState;
use axum::extract::{Path, Query, State};
use axum::extract::rejection::{PathRejection, QueryRejection};
use axum::http::{StatusCode};
use axum::routing::get;
use axum::{Extension, Router};
use axum::http::header::{CONTENT_TYPE};
use axum::response::IntoResponse;
use log::info;
use serde::{Deserialize};
use time::{ OffsetDateTime};
use tokio::time::Instant;
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;
use crate::response::ResponseFormat;

pub fn router() -> Router<AppState> {
    let rate_limit_config = GovernorConfigBuilder::default()
        .per_second(10)
        .burst_size(40)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    Router::new()
        .route("/{id}", get(fetch_records).route_layer(GovernorLayer::new(rate_limit_config)))
}

#[derive(Deserialize)]
struct GetParam {
    #[serde(with = "time::serde::timestamp")]
    pub from: OffsetDateTime,
    #[serde(with = "time::serde::timestamp::option", default)]
    pub to: Option<OffsetDateTime>,
    pub json: Option<bool>,
}

async fn fetch_records(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>,
                    query: Result<Query<GetParam>, QueryRejection>) -> Result<impl IntoResponse, AppError> {
    let id = *id?;
    let query = query?;

    let instant = Instant::now();
    let server = state.repository.get_server(id).await;
    if let Err(err) = server {
        return Err(AppError::ServerNotFoundError(err));
    }
    let server = server.unwrap();
    let is_admin = account.is_some_and(|u| u.is_admin());
    if server.hidden && !is_admin {
        return Err(AppError::ServerNotFoundError("Hidden server".to_string()));
    }

    let result = state.repository.get_pings(id, query.from, query.to).await;
    if let Err(error) = result {
        return Err(AppError::FetchingDataError(error));
    }
    
    info!("Time to request all database data {}ms", instant.elapsed().as_millis());

    let data = result.unwrap();

    if !query.json.unwrap_or(false) {
        Ok((
            StatusCode::OK,
            [(CONTENT_TYPE, "application/octet-stream")],
            data.into_binary()
        ).into_response())
    } else {
        Ok(ResponseFormat::success(data, StatusCode::OK).into_response())
    }
}
