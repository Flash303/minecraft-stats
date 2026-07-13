use axum::extract::rejection::{JsonRejection, PathRejection, QueryRejection};
use crate::response::ResponseFormat;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Fetching data failed")]
    FetchingDataError(String),

    #[error("Server creation failed: {0}")]
    ServerCreationError(String),

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

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match &self {
            AppError::FetchingDataError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::ServerCreationError(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::FeatureDisabledError => StatusCode::NOT_FOUND,
            AppError::AuthenticationError(_) => StatusCode::UNAUTHORIZED,
            AppError::ServerNotFoundError(_) => StatusCode::NOT_FOUND,
            AppError::InvalidParamError(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidQueryError(_) => StatusCode::BAD_REQUEST,
            AppError::InvalidJsonError(_) => StatusCode::BAD_REQUEST,
        };

        ResponseFormat::<()>::error(self.to_string(), status).into_response()
    }
}
