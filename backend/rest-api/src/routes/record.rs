use crate::services::clerk::model::ClerkClaims;
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::state::AppState;
use axum::extract::{Path, Query, State};
use axum::extract::rejection::{PathRejection, QueryRejection};
use axum::http::{StatusCode};
use axum::routing::get;
use axum::{Extension, Router};
use log::info;
use redis::AsyncCommands;
use repository::models::record::{RecordData};
use serde::{Deserialize};
use time::{ OffsetDateTime};
use tokio::time::Instant;
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;
use crate::services::cache::record_caching::{cache_missing_records, get_all_used_days, get_cached_range};

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
}

async fn fetch_records(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>,
                    query: Result<Query<GetParam>, QueryRejection>) -> Result<ResponseFormat<RecordData>, AppError> {
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

    let to_dt = query.to.unwrap_or_else(|| OffsetDateTime::now_utc());
    let rs = get_cached_range(state.clone(), id, query.from, to_dt).await;

    info!("Cached range {}%", rs.percentage);

    if rs.percentage > 50f64 {
        use redis::AsyncCommands;
        let mut redis_con = state.redis_client.get().await.unwrap();

        let from_ts = query.from.unix_timestamp().max(0) as u32;
        let to_ts = to_dt.unix_timestamp().max(0) as u32;

        let mut final_timestamps = Vec::new();
        let mut final_values = Vec::new();

        // Get all cached dates
        for data in rs.daily_ranges {
            let day = data.0;
            let key = format!("{}_{}", day.to_value_key(), id);

            for range in data.1 {
                let query_start = range.0.max(from_ts);
                let query_end = range.1.min(to_ts);

                let result: Result<Vec<(u32, u32)>, _> = redis_con.zrangebyscore_withscores(&key, query_start, query_end).await;
                if let Ok(data) = result {
                    for (value, score) in data {
                        final_timestamps.push(score as i64);
                        final_values.push(value);
                    }
                }
            }
        }

        let mut missing_ranges = Vec::new();
        let mut current_ts = from_ts;

        // Identify missing gaps to fetch from SQL
        for &(start, end) in &rs.merged_ranges {
            let intersection_start = start.max(current_ts);
            if intersection_start > current_ts {
                missing_ranges.push((current_ts, intersection_start));
            }
            current_ts = current_ts.max(end);
        }
        if current_ts < to_ts {
            missing_ranges.push((current_ts, to_ts));
        }

        let mut missing_to_cache_ts = Vec::new();
        let mut missing_to_cache_val = Vec::new();

        for (m_start, m_end) in missing_ranges.clone() {
            if let (Ok(m_from), Ok(m_to)) = (OffsetDateTime::from_unix_timestamp(m_start as i64), OffsetDateTime::from_unix_timestamp(m_end as i64)) {
                if let Ok(mut missing_data) = state.repository.get_pings(id, m_from, Some(m_to)).await {
                    missing_to_cache_ts.extend_from_slice(&missing_data.0);
                    missing_to_cache_val.extend_from_slice(&missing_data.1);

                    final_timestamps.append(&mut missing_data.0);
                    final_values.append(&mut missing_data.1);
                }
            }
        }

        if !missing_to_cache_ts.is_empty() {
            let cache_data = RecordData(missing_to_cache_ts, missing_to_cache_val);
            cache_missing_records(state.clone(), id, missing_ranges, &cache_data).await;
        }

        let mut combined: Vec<(i64, u32)> = final_timestamps.into_iter().zip(final_values.into_iter()).collect();
        combined.sort_unstable_by_key(|k| k.0);

        let (sorted_ts, sorted_val): (Vec<i64>, Vec<u32>) = combined.into_iter().unzip();
        let final_record_data = RecordData(sorted_ts, sorted_val);

        info!("Time to request from cache and db {}ms", instant.elapsed().as_millis());
        return Ok(ResponseFormat::success(final_record_data, StatusCode::ACCEPTED));
    }

    let result = state.repository.get_pings(id, query.from, query.to).await;
    if let Err(error) = result {
        return Err(AppError::FetchingDataError(error));
    }
    
    let data = result.unwrap();
    let from_ts = query.from.unix_timestamp().max(0) as u32;
    let to_ts = to_dt.unix_timestamp().max(0) as u32;
    cache_missing_records(state.clone(), id, vec![(from_ts, to_ts)], &data).await;

    info!("Time to request all database data {}ms", instant.elapsed().as_millis());

    Ok(ResponseFormat::success(data, StatusCode::ACCEPTED))
}
