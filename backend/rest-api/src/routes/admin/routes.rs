use axum::{Router, middleware::from_fn_with_state};
use crate::{middleware::admin::admin_middleware, routes::admin::{server, users}, state::AppState};

pub fn router(state: AppState) -> Router<AppState>{
    Router::new()
        .merge(users::router())
        .merge(server::router())
        .route_layer(from_fn_with_state(state.clone(), admin_middleware))
}