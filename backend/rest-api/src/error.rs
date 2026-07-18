use std::fmt::{Debug};
use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use crate::response::ResponseFormat;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
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
            ServerCreationError::Database => "error.server_creation.database_problem"
        }.to_string()
    }
}

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Fetching data failed")]
    FetchingDataError(String),

    #[error("Server creation failed: {0}")]
    ServerCreationError(ServerCreationError),

    #[error("This feature is disabled")]
    FeatureDisabledError,

    #[error("Authentification error: {0}")]
    AuthenticationError(String),

    #[error("Server not found")]
    ServerNotFoundError(String),

    #[error("{0}")]
    InvalidParamError(#[from] PathRejection),
    
    #[error("{0}")]
    InvalidQueryError(#[from] QueryRejection),
    
    #[error("{0}")]
    InvalidJsonError(#[from] JsonRejection),
}

impl AppError {
    fn status(&self) -> StatusCode {
        match &self {
            AppError::FetchingDataError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ServerCreationError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FeatureDisabledError => StatusCode::NOT_FOUND,
            AppError::AuthenticationError(_) => StatusCode::UNAUTHORIZED,
            AppError::ServerNotFoundError(_) => StatusCode::NOT_FOUND,
            AppError::InvalidParamError(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidQueryError(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidJsonError(_) => StatusCode::BAD_REQUEST,
        }
    }

    fn translation_key(&self) -> String {
        match &self {
            AppError::FetchingDataError(_) => "error.fetching_data".into(),
            AppError::ServerCreationError(e) => e.translation_key(),
            AppError::FeatureDisabledError => "error.disabled_feature".into(),
            AppError::AuthenticationError(_) => "error.authentification".into(),
            AppError::ServerNotFoundError(_) => "error.server_not_found".into(),
            AppError::InvalidParamError(_) => "error.validation.invalid_param".into(),
            AppError::InvalidQueryError(_) => "error.validation.invalid_query".into(),
            AppError::InvalidJsonError(_) => "error.validation.invalid_json".into(),
        }
    }
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        ResponseFormat::<()>::error_translation(self.to_string(), self.translation_key(), self.status()).into_response()
    }
}
