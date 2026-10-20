use super::status;
use crate::state::AppState;
use crate::utils::rate_limit::ClientIpKeyExtractor;
use axum::Router;
use axum::routing::get;
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;

pub fn router() -> Router<AppState> {
    let rate_limit_config = GovernorConfigBuilder::default()
        .per_second(2)
        .burst_size(10)
        .key_extractor(ClientIpKeyExtractor)
        .finish()
        .unwrap();

    Router::new().route(
        "/status",
        get(status::get_status).route_layer(GovernorLayer::new(rate_limit_config)),
    )
}
