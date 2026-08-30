use axum::routing::get;
use axum::Router;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::GovernorLayer;
use crate::state::AppState;
use crate::utils::rate_limit::ClientIpKeyExtractor;
use super::status;

pub fn router() -> Router<AppState> {
    let rate_limit_config = GovernorConfigBuilder::default()
        .per_second(2)
        .burst_size(10)
        .key_extractor(ClientIpKeyExtractor)
        .finish()
        .unwrap();

    Router::new()
        .route("/status", get(status::get_status).route_layer(GovernorLayer::new(rate_limit_config)))
}
