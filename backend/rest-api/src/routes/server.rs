use std::time::Duration;
use base64::Engine;
use axum::response::IntoResponse;

use crate::services::clerk::model::{ClerkClaims, ClerkUser};
use crate::error::AppError;
use crate::response::ResponseFormat;
use crate::services::clerk::clerk_service;
use crate::state::AppState;
use axum::extract::rejection::{JsonRejection, PathRejection};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::routing::{get, patch, post, delete};
use axum::{Extension, Json, Router};
use minecraft_pinger::config::PingConfig;
use repository::models::record::{RecordData};
use repository::models::server::{Server, DraftServer, ServerType};
use repository::models::alert::{Alert, AlertType, DraftAlert};
use repository::duplicate_detection::{DuplicateDetectionService, ServerFingerprint};
use serde::{Deserialize, Serialize};
use tower_governor::GovernorLayer;
use tower_governor::governor::GovernorConfigBuilder;
use tower_governor::key_extractor::SmartIpKeyExtractor;

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
        .route("/mine", get(get_mine_server).route_layer(layer))
        .route("/", post(create_server).route_layer(GovernorLayer::new(push_server_limit)))
        .route("/{id}", patch(update_server_name).route_layer(GovernorLayer::new(patch_server_limit)))
        .route("/{id}/alerts", get(list_alerts).post(create_alert))
        .route("/alerts/{alert_id}", delete(delete_alert))
        .route("/{id}/icon", get(get_server_icon))
}

#[derive(Serialize, Deserialize)]
struct BiggerServerResponse {
    #[serde(flatten)]
    pub server: Server,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<RecordData>,
}

impl From<Server> for BiggerServerResponse {
    fn from(server: Server) -> Self {
        BiggerServerResponse {
            server,
            data: None,
        }
    }
}

#[derive(Deserialize)]
struct QueryParams {
    pub include_stats: Option<bool>,
}

async fn list_all_servers(State(state): State<AppState>,
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

async fn get_mine_server(State(state): State<AppState>,
                         Query(query): Query<QueryParams>,
                         Extension(account): Extension<Option<ClerkClaims>>) -> Result<ResponseFormat<Vec<BiggerServerResponse>>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }
    let account = account.unwrap();
    let include_stats = query.include_stats.unwrap_or(false);

    let result = state.repository.get_servers_of_user(account.id().clone()).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::FetchingDataError(error));
    }

    let mut servers: Vec<BiggerServerResponse> = result.unwrap()
        .into_iter()
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

#[derive(Serialize)]
struct ServerWithUser {
    #[serde(flatten)]
    pub server: Server,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user: Option<ClerkUser>
}

async fn get_server(State(state): State<AppState>,
                    Extension(account): Extension<Option<ClerkClaims>>,
                    id: Result<Path<u32>, PathRejection>) -> Result<ResponseFormat<ServerWithUser>, AppError> {
    if let Err(error) = id {
        return Err(AppError::InvalidParamError(error.to_string()));
    }

    let result = state.repository.get_server(*id.unwrap()).await;
    if let Err(error) = result {
        println!("Error listing servers: {:?}", error);
        return Err(AppError::ServerNotFoundError(error));
    }
    let mut server = ServerWithUser {
        server: result.unwrap(),
        user: None
    };

    let is_admin = account.is_some_and(|u| u.is_admin());
    if server.server.hidden && !is_admin {
        return Err(AppError::ServerNotFoundError("Hidden server".to_string()));
    }

    let user = clerk_service::get_clerk_user_with_cache(&state, &server.server.user_id)
        .await
        .ok();

    if let Some(clerk_user) = user {
        server.user = Some((*clerk_user).clone());
    }

    Ok(ResponseFormat::success(server, StatusCode::OK))
}

async fn create_server(State(state): State<AppState>,
                       Extension(account): Extension<Option<ClerkClaims>>,
                       query: Result<Json<DraftServer>, JsonRejection>) -> Result<ResponseFormat<Server>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }

    if let Err(error) = query {
        return Err(AppError::InvalidJsonError(error.to_string()));
    }
    let mut query = query.unwrap().0;

    // max 3 try
    let mut is_reachable = false;
    let mut version_name = None;
    for _ in 0..3 {
        let ping_res = match query.server_type {
            ServerType::Java => {
                let res = state.pigner.ping_java_server(query.ip.as_str(), query.port, &PingConfig::default()).await;
                if let Ok(ping) = &res {
                    query.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
                    let motd_value = serde_json::to_value(&ping.description).ok();
                    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.name.clone());
                }
                res.is_ok()
            },
            ServerType::Bedrock => {
                let res = state.pigner.ping_bedrock_server(query.ip.as_str(), query.port, &PingConfig::default()).await;
                if let Ok(ping) = &res {
                    query.favicon_hash = None;
                    let motd_value = serde_json::to_value(&ping.motd).ok();
                    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.clone());
                }
                res.is_ok()
            }
        };

        if ping_res {
            is_reachable = true;
            break;
        }
    }

    if !is_reachable {
        return Err(AppError::ServerCreationError("Server not reachable".to_string()));
    }

    query.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(query.ip.as_str(), query.port).await;

    let fingerprint = ServerFingerprint {
        favicon_hash: query.favicon_hash.clone(),
        resolved_endpoint: query.resolved_endpoint.clone(),
        motd_hash: query.motd_hash.clone(),
        version: version_name,
    };

    if let Some(duplicate) = DuplicateDetectionService::find_duplicate(
        state.repository.as_ref(),
        &fingerprint,
        None,
    ).await.map_err(|e| AppError::ServerCreationError(e))? {
        println!(
            "Server name {} is similar to existing server {} (ID: {}) with score {} (signals: {:?})",
            query.name,
            duplicate.server.name,
            duplicate.server.id,
            duplicate.score,
            duplicate.signals
        );

        drop(fingerprint);
        return Err(AppError::ServerCreationError("Server already exists".to_string()));
    }
    drop(fingerprint);

    query.user_id = Some(account.unwrap().sub);

    let rs = state.repository.create_server(query).await;
    if let Err(error) = rs {
        println!("Error creating server: {:?}", error);
        return Err(AppError::ServerCreationError(error));
    }

    Ok(ResponseFormat::success(rs.unwrap(), StatusCode::OK))
}

#[derive(Deserialize)]
struct UpdateServerPayload {
    name: String,
}

async fn update_server_name(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(id): Path<u32>,
    Json(payload): Json<UpdateServerPayload>,
) -> Result<ResponseFormat<Server>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    let mut server = state.repository.get_server(id).await.map_err(|e| AppError::ServerNotFoundError(e))?;
    
    let is_owner = server.user_id == account.sub;
    if !is_owner && !account.is_admin() {
        return Err(AppError::AuthenticationError("Forbidden".to_string()));
    }

    server.name = payload.name;
    state.repository.update_server(&server).await.map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success(server, StatusCode::OK))
}

async fn list_alerts(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(server_id): Path<u32>,
) -> Result<ResponseFormat<Vec<Alert>>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    // Verify server exists
    state.repository.get_server(server_id).await
        .map_err(|e| AppError::ServerNotFoundError(e))?;

    let alerts = state.repository.list_alerts_for_server(server_id).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    let user_alerts: Vec<Alert> = alerts
        .into_iter()
        .filter(|a| a.user_id == account.sub)
        .collect();

    Ok(ResponseFormat::success(user_alerts, StatusCode::OK))
}

#[derive(Deserialize)]
struct CreateAlertPayload {
    pub alert_type: AlertType,
    pub player_threshold: Option<u32>,
    pub is_active: Option<bool>,
}

async fn create_alert(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(server_id): Path<u32>,
    Json(payload): Json<CreateAlertPayload>,
) -> Result<ResponseFormat<Alert>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    // Verify server exists
    state.repository.get_server(server_id).await
        .map_err(|e| AppError::ServerNotFoundError(e))?;

    let draft = DraftAlert {
        user_id: account.sub.clone(),
        server_id,
        alert_type: payload.alert_type,
        player_threshold: payload.player_threshold,
        is_active: payload.is_active.unwrap_or(true),
    };

    let alert = state.repository.create_alert(draft).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success(alert, StatusCode::CREATED))
}

async fn delete_alert(
    State(state): State<AppState>,
    Extension(account): Extension<Option<ClerkClaims>>,
    Path(alert_id): Path<u32>,
) -> Result<ResponseFormat<()>, AppError> {
    let account = account.ok_or_else(|| AppError::AuthenticationError("Unauthorized".to_string()))?;

    state.repository.delete_alert(alert_id, account.sub.clone()).await
        .map_err(|e| AppError::FetchingDataError(e))?;

    Ok(ResponseFormat::success((), StatusCode::NO_CONTENT))
}

async fn get_server_icon(
    State(state): State<AppState>,
    Path(id): Path<u32>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    let server = state.repository.get_server(id).await.map_err(|e| AppError::ServerNotFoundError(e))?;
    
    if let Some(favicon) = server.last_favicon {
        if let Some(base64_data) = favicon.strip_prefix("data:image/png;base64,") {
            if let Ok(image_bytes) = base64::engine::general_purpose::STANDARD.decode(base64_data) {
                return Ok((
                    [(axum::http::header::CONTENT_TYPE, "image/png"), (axum::http::header::CACHE_CONTROL, "public, max-age=86400")],
                    image_bytes
                ).into_response());
            }
        }
    }
    
    Ok(axum::response::Redirect::temporary("https://wd40.theking90000.be/files/ee292f4a-dfff-4c5f-b65e-1beca56ec24f").into_response())
}
