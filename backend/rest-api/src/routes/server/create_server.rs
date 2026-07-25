use std::time::Duration;
use axum::{Extension, Json};
use axum::extract::rejection::JsonRejection;
use axum::extract::State;
use axum::http::StatusCode;
use log::{error, info};
use minecraft_pinger::config::PingConfig;
use repository::duplicate_detection::{DuplicateDetectionService, ServerFingerprint};
use repository::models::server::{DraftServer, Server, ServerType};
use crate::error::{AppError, ServerCreationError};
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

const ADD_TIMEOUT: Duration = Duration::from_secs(3);

pub(super) async fn create_server(State(state): State<AppState>,
                       Extension(account): Extension<Option<ClerkClaims>>,
                       query: Result<Json<DraftServer>, JsonRejection>) -> Result<ResponseFormat<Server>, AppError> {
    if account.is_none() {
        return Err(AppError::AuthenticationError("Unauthorized".to_string()));
    }
    
    let mut query = query?.0;

    // max 3 try
    let mut is_reachable = false;
    let mut version_name = None;

    let cfg = PingConfig::builder()
        .set_timeout(ADD_TIMEOUT)
        .build();
    
    for _ in 0..3 {
        let ping_res = match query.server_type {
            ServerType::Java => {
                let res = state.pigner.ping_java_server(query.ip.as_str(), query.port, &cfg).await;
                if let Ok(ping) = &res {
                    query.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
                    let motd_value = serde_json::to_value(&ping.description).ok();
                    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.name.clone());
                }

                if let Err(err) = &res {
                    error!("Could not add java the server {} error {}", query.ip, err)
                }
                res.is_ok()
            },
            ServerType::Bedrock => {
                let res = state.pigner.ping_bedrock_server(query.ip.as_str(), query.port, &cfg).await;
                if let Ok(ping) = &res {
                    query.favicon_hash = None;
                    let motd_value = serde_json::to_value(&ping.motd).ok();
                    query.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.clone());
                }

                if let Err(err) = &res {
                    error!("Could not add bedrock the server {} error {}", query.ip, err)
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
        return Err(AppError::ServerCreationError(ServerCreationError::NotReachable));
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
    ).await.map_err(|e| AppError::ServerCreationError(ServerCreationError::DuplicationDetection(e)))? {
        info!(
            "Server name {} is similar to existing server {} (ID: {}) with score {} (signals: {:?})",
            query.name,
            duplicate.server.name,
            duplicate.server.id,
            duplicate.score,
            duplicate.signals
        );

        drop(fingerprint);
        return Err(AppError::ServerCreationError(ServerCreationError::AlreadyExist));
    }
    drop(fingerprint);

    query.user_id = Some(account.unwrap().sub);

    let rs = state.repository.create_server(query).await;
    if let Err(_error) = rs {
        return Err(AppError::ServerCreationError(ServerCreationError::Database));
    }

    Ok(ResponseFormat::success(rs.unwrap(), StatusCode::OK))
}