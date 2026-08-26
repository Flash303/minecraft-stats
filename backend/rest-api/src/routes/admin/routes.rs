use axum::{Router, middleware::from_fn_with_state};
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::GovernorLayer;
use crate::{middleware::admin::admin_middleware, routes::admin::{server, users}, state::AppState};
use crate::utils::rate_limit::ClientIpKeyExtractor;

pub fn router(state: AppState) -> Router<AppState>{
    let admin_limit = GovernorConfigBuilder::default()
        .per_second(10)
        .burst_size(40)
        .key_extractor(ClientIpKeyExtractor)
        .finish()
        .unwrap();

    Router::new()
        .merge(users::router())
        .merge(server::router())
        .route_layer(from_fn_with_state(state.clone(), admin_middleware))
        .route_layer(GovernorLayer::new(admin_limit))
}