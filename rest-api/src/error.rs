use crate::response::ResponseFormat;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

pub enum AppError {
    FetchingDataError(String),

    ServerCreationError(String),

    AuthenticationError(String),

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

            AppError::ServerCreationError(_) => {
                ResponseFormat::<()>::error("Server creation failed".to_string(), StatusCode::INTERNAL_SERVER_ERROR)
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
        }.into_response()
    }
}