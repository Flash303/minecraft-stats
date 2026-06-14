use crate::response::ResponseFormat;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

pub enum AppError {
    FetchingDataError(String),

    ServerCreationError(String),

    FeatureDisabledError(String),

    AuthenticationError(String),
    
    UserNotFoundError(String),
    ServerNotFoundError(String),

    InvalidParamError(String),
    InvalidQueryError(String),
    InvalidJsonError(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        match self {
            AppError::FetchingDataError(_) => {
                ResponseFormat::<()>::error("Fetching data failed".to_string(), StatusCode::INTERNAL_SERVER_ERROR)
            }

            AppError::ServerCreationError(e) => {
                ResponseFormat::<()>::error(format!("Server creation failed: {e}"), StatusCode::INTERNAL_SERVER_ERROR)
            }

            AppError::AuthenticationError(error) => {
                ResponseFormat::<()>::error(format!("Authentification error: {error}"), StatusCode::UNAUTHORIZED)
            }

            AppError::InvalidParamError(e) => {
                ResponseFormat::<()>::error(e, StatusCode::BAD_REQUEST)
            }
            AppError::InvalidQueryError(e) => {
                ResponseFormat::<()>::error(e, StatusCode::BAD_REQUEST)
            }
            AppError::InvalidJsonError(e) => {
                ResponseFormat::<()>::error(e, StatusCode::BAD_REQUEST)
            }
            AppError::UserNotFoundError(_) => {
                ResponseFormat::<()>::error("User not found".to_string(), StatusCode::NOT_FOUND)
            }
            AppError::ServerNotFoundError(_) => {
                ResponseFormat::<()>::error("Server not found".to_string(), StatusCode::NOT_FOUND)
            }
            AppError::FeatureDisabledError(_) => {
                ResponseFormat::<()>::error("This feature is disabled".to_string(), StatusCode::NOT_FOUND)
            }
        }.into_response()
    }
}
