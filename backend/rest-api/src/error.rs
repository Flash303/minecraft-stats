use crate::response::ResponseFormat;
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use repository::error::RepositoryError;
use reqwest::Error;
use std::fmt::Debug;
use std::net::IpAddr;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ServerCreationError {
    #[error("Server not reachable")]
    NotReachable,

    #[error("Server already exists")]
    AlreadyExist,

    #[error("{0}")]
    DuplicationDetection(String),

    #[error("Database problem while adding the server")]
    Database,
}

impl ServerCreationError {
    fn translation_key(&self) -> String {
        match self {
            ServerCreationError::NotReachable => "error.server_creation.not_reachable",
            ServerCreationError::AlreadyExist => "error.server_creation.already_exist",
            ServerCreationError::DuplicationDetection(_) => "error.server_creation.duplicate",
            ServerCreationError::Database => "error.server_creation.database_problem",
        }
        .to_string()
    }
}

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Fetching data failed")]
    FetchingData(#[from] RepositoryError),

    #[error("Server creation failed: {0}")]
    ServerCreation(ServerCreationError),

    #[error("This feature is disabled")]
    FeatureDisabled,

    #[error("Unauthorized")]
    Authentication,

    #[error("Server not found")]
    ServerNotFound,

    #[error("Fetch failed")]
    Request(#[from] Error),

    #[error("Clerk fetch failed {0}")]
    ClerkApiProblem(String),

    #[error("{0}")]
    InvalidParam(#[from] PathRejection),

    #[error("{0}")]
    InvalidQuery(#[from] QueryRejection),

    #[error("{0}")]
    InvalidJson(#[from] JsonRejection),

    #[error("Blocked endpoint: {}", format_blocked_ips(.0))]
    BlockedEndpoint(Vec<IpAddr>),
}

/// Renders blocked IPs as a comma-separated list (`Vec` has no `Display`).
fn format_blocked_ips(ips: &[IpAddr]) -> String {
    ips.iter()
        .map(IpAddr::to_string)
        .collect::<Vec<_>>()
        .join(", ")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::{IpAddr, Ipv4Addr};

    #[test]
    fn blocked_endpoint_lists_ips_comma_separated() {
        let err = AppError::BlockedEndpoint(vec![
            IpAddr::V4(Ipv4Addr::new(127, 0, 0, 1)),
            IpAddr::V4(Ipv4Addr::new(10, 0, 0, 1)),
        ]);
        assert_eq!(err.to_string(), "Blocked endpoint: 127.0.0.1, 10.0.0.1");
    }

    #[test]
    fn blocked_endpoint_handles_empty_list() {
        let err = AppError::BlockedEndpoint(vec![]);
        assert_eq!(err.to_string(), "Blocked endpoint: ");
    }
}

impl AppError {
    fn status(&self) -> StatusCode {
        match &self {
            AppError::FetchingData(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ServerCreation(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Request(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ClerkApiProblem(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FeatureDisabled => StatusCode::NOT_FOUND,
            AppError::Authentication => StatusCode::UNAUTHORIZED,
            AppError::ServerNotFound => StatusCode::NOT_FOUND,
            AppError::InvalidParam(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidQuery(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidJson(_) => StatusCode::BAD_REQUEST,
            AppError::BlockedEndpoint(_) => StatusCode::BAD_REQUEST,
        }
    }

    fn translation_key(&self) -> String {
        match &self {
            AppError::FetchingData(_) => "error.fetching_data".into(),
            AppError::ServerCreation(e) => e.translation_key(),
            AppError::Request(_) => "error.fetch_failed".into(),
            AppError::ClerkApiProblem(_) => "error.fetch_failed".into(),
            AppError::FeatureDisabled => "error.disabled_feature".into(),
            AppError::Authentication => "error.authentification".into(),
            AppError::ServerNotFound => "error.server_not_found".into(),
            AppError::InvalidParam(_) => "error.validation.invalid_param".into(),
            AppError::InvalidQuery(_) => "error.validation.invalid_query".into(),
            AppError::InvalidJson(_) => "error.validation.invalid_json".into(),
            AppError::BlockedEndpoint(_) => "error.validation.blocked_endpoint".into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        ResponseFormat::<()>::error_translation(
            self.to_string(),
            self.translation_key(),
            self.status(),
        )
        .into_response()
    }
}
