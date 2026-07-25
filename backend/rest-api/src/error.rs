use std::fmt::{Debug};
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use crate::response::ResponseFormat;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use reqwest::Error;
use thiserror::Error;
use repository::error::RepositoryError;

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
            ServerCreationError::Database => "error.server_creation.database_problem"
        }.to_string()
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

    #[error("{0}")]
    InvalidParam(#[from] PathRejection),
    
    #[error("{0}")]
    InvalidQuery(#[from] QueryRejection),
    
    #[error("{0}")]
    InvalidJson(#[from] JsonRejection),
}

impl AppError {
    fn status(&self) -> StatusCode {
        match &self {
            AppError::FetchingData(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ServerCreation(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Request(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FeatureDisabled => StatusCode::NOT_FOUND,
            AppError::Authentication => StatusCode::UNAUTHORIZED,
            AppError::ServerNotFound => StatusCode::NOT_FOUND,
            AppError::InvalidParam(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidQuery(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidJson(_) => StatusCode::BAD_REQUEST,
        }
    }

    fn translation_key(&self) -> String {
        match &self {
            AppError::FetchingData(_) => "error.fetching_data".into(),
            AppError::ServerCreation(e) => e.translation_key(),
            AppError::Request(_) => "error.fetch_failed".into(),
            AppError::FeatureDisabled => "error.disabled_feature".into(),
            AppError::Authentication => "error.authentification".into(),
            AppError::ServerNotFound => "error.server_not_found".into(),
            AppError::InvalidParam(_) => "error.validation.invalid_param".into(),
            AppError::InvalidQuery(_) => "error.validation.invalid_query".into(),
            AppError::InvalidJson(_) => "error.validation.invalid_json".into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        ResponseFormat::<()>::error_translation(self.to_string(), self.translation_key(), self.status()).into_response()
    }
}
