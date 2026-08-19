use std::time::Duration;
use axum::{Extension, Json};
use axum::extract::rejection::JsonRejection;
use axum::extract::State;
use axum::http::StatusCode;
use log::{error, info};
use minecraft_pinger::config::PingConfig;
use minecraft_pinger::java::config::JavaPingConfig;
use repository::duplicate_detection::{DuplicateDetectionService, ServerFingerprint};
use repository::models::server::{DraftServer, Server, ServerType};
use crate::error::{AppError, ServerCreationError};
use crate::response::ResponseFormat;
use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

const ADD_TIMEOUT: Duration = Duration::from_secs(2);
const PING_TRY_COUNT: usize = 2;

pub(super) async fn create_server(State(state): State<AppState>,
                       Extension(account): Extension<Option<ClerkClaims>>,
                       query: Result<Json<DraftServer>, JsonRejection>) -> Result<ResponseFormat<Server>, AppError> {
    let account = account.ok_or(AppError::Authentication)?;
    
    let mut draft = query?.0;

    let (is_reachable, version_name) = ping_server(&state, &mut draft).await;
    if !is_reachable {
        return Err(AppError::ServerCreation(ServerCreationError::NotReachable));
    }

    draft.resolved_endpoint = DuplicateDetectionService::resolve_endpoint(draft.ip.as_str(), draft.port).await;

    let fingerprint = ServerFingerprint {
        favicon_hash: draft.favicon_hash.clone(),
        resolved_endpoint: draft.resolved_endpoint.clone(),
        motd_hash: draft.motd_hash.clone(),
        version: version_name,
    };

    if let Some(duplicate) = DuplicateDetectionService::find_duplicate(
        state.repository.as_ref(),
        &fingerprint,
        None,
    ).await.map_err(|e| AppError::ServerCreation(ServerCreationError::DuplicationDetection(e.to_string())))? {
        info!(
            "Server name {} is similar to existing server {} (ID: {}) with score {} (signals: {:?})",
            draft.name,
            duplicate.server.name,
            duplicate.server.id,
            duplicate.score,
            duplicate.signals
        );

        return Err(AppError::ServerCreation(ServerCreationError::AlreadyExist));
    }

    draft.user_id = Some(account.sub);

    let rs = match state.repository.create_server(draft).await {
        Ok(rs) => rs,
        Err(err) if err.is_unique_violation() => {
            return Err(AppError::ServerCreation(ServerCreationError::AlreadyExist));
        }
        Err(err) => return Err(err.into()),
    };
    Ok(ResponseFormat::success(rs, StatusCode::OK))
}

async fn ping_server(state: &AppState, draft: &mut DraftServer) -> (bool, Option<String>) {
    let mut is_reachable = false;
    let mut version_name = None;

    let cfg = PingConfig::builder()
        .set_timeout(ADD_TIMEOUT)
        .build();

    let java_cfg = JavaPingConfig::from(&cfg.to_builder()).build();

    for _ in 0..PING_TRY_COUNT {
        let ping_res = match draft.server_type {
            ServerType::Java => {
                let res = state.pinger.ping_java_server(draft.ip.as_str(), draft.port, &java_cfg).await;
                if let Ok(ping) = &res {
                    draft.favicon_hash = DuplicateDetectionService::hash_favicon(ping.favicon.as_deref());
                    let motd_value = serde_json::to_value(&ping.description).ok();
                    draft.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.name.clone());
                }

                if let Err(err) = &res {
                    error!("Could not add java the server {} error {}", draft.ip, err)
                }
                res.is_ok()
            },
            ServerType::Bedrock => {
                let res = state.pinger.ping_bedrock_server(draft.ip.as_str(), draft.port, &cfg).await;
                if let Ok(ping) = &res {
                    draft.favicon_hash = None;
                    let motd_value = serde_json::to_value(&ping.motd).ok();
                    draft.motd_hash = DuplicateDetectionService::hash_motd(motd_value.as_ref());
                    version_name = Some(ping.version.clone());
                }

                if let Err(err) = &res {
                    error!("Could not add bedrock the server {} error {}", draft.ip, err)
                }
                res.is_ok()
            }
        };

        if ping_res {
            is_reachable = true;
            break;
        }
    }

    (is_reachable, version_name)
}