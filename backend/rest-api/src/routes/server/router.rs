use std::time::Duration;
use axum::Router;
use axum::routing::{delete, get, patch, post};
use log::info;
use serde::{Deserialize, Serialize};
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::GovernorLayer;
use tower_governor::key_extractor::SmartIpKeyExtractor;
use repository::models::record::RecordData;
use repository::models::server::Server;
use crate::error::AppError;
use crate::routes::server::create_alert::create_alert;
use crate::routes::server::create_server::create_server;
use crate::routes::server::delete_server::delete_alert;
use crate::routes::server::get_icon::get_server_icon;
use crate::routes::server::get_server::{get_mine_server, get_server};
use crate::routes::server::list_alert::list_alerts;
use crate::routes::server::list_server::list_all_servers;
use crate::routes::server::update_server::update_server_name;
use crate::services::clerk::model::ClerkUser;
use crate::state::AppState;

pub fn router() -> Router<AppState> {
    let get_server_limit = GovernorConfigBuilder::default()
        .per_second(5)
        .burst_size(40)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    let push_server_limit = GovernorConfigBuilder::default()
        .period(Duration::from_secs(10))
        .burst_size(3)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    let patch_server_limit = GovernorConfigBuilder::default()
        .period(Duration::from_secs(10))
        .burst_size(10)
        .key_extractor(SmartIpKeyExtractor)
        .finish()
        .unwrap();

    let layer = GovernorLayer::new(get_server_limit);

    Router::new()
        .route("/", get(list_all_servers).route_layer(layer.clone()))

        .route("/{id}", get(get_server).route_layer(layer.clone()))
        .route("/mine", get(get_mine_server).route_layer(layer.clone()))
        .route("/{id}/icon", get(get_server_icon).route_layer(layer))

        .route("/{id}/alerts", get(list_alerts).post(create_alert))
        .route("/alerts/{alert_id}", delete(delete_alert))

        .route("/", post(create_server).route_layer(GovernorLayer::new(push_server_limit)))
        .route("/{id}", patch(update_server_name).route_layer(GovernorLayer::new(patch_server_limit)))
}

pub(super) async fn include_stats(include_stats: bool,
                           state: &AppState,
                           servers: &mut Vec<BiggerServerResponse>) -> Result<(), AppError> {
    if include_stats {
        let server_ids: Vec<u32> = servers.iter().map(|s| s.server.id).collect();

        let records_result = state.repository.get_last_pings_for_servers(&server_ids).await;
        if let Err(error) = records_result {
            info!("Error fetching last pings for servers: {:?}", error);
            return Err(AppError::FetchingDataError(error));
        }

        let mut records_map = records_result.unwrap();
        for s in servers {
            s.data = records_map.remove(&s.server.id);
        }
    }

    Ok(())
}

#[derive(Deserialize)]
pub(super) struct ServerListQueryParams {
    pub include_stats: Option<bool>,
    pub include_owners: Option<bool>,
}

#[derive(Serialize, Deserialize)]
pub(super) struct BiggerServerResponse {
    #[serde(flatten)]
    pub server: Server,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<RecordData>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<ClerkUser>,
}

impl BiggerServerResponse {
    pub fn from_with_user(server: Server, user: Option<ClerkUser>) -> BiggerServerResponse {
        Self {
            server,
            data: None,
            user
        }
    }

    pub fn from(server: Server) -> BiggerServerResponse {
        Self {
            server,
            data: None,
            user: None
        }
    }
}