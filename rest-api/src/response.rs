use axum::http::StatusCode;
use axum::Json;
use axum::response::IntoResponse;
use serde::{Serialize};

#[derive(Serialize, Debug)]
pub struct ResponseFormat<T> {
    pub success: bool,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,

    #[serde(skip)]
    pub status: StatusCode,
}

impl<T> ResponseFormat<T> {
    pub fn success(data: T, status: StatusCode) -> Self {
        ResponseFormat {
            success: true,
            data: Some(data),
            message: None,
            status,
        }
    }

    pub fn error(message: String, status: StatusCode) -> Self {
        ResponseFormat {
            success: false,
            data: None,
            message: Some(message),
            status,
        }
    }
}

impl<T: Serialize> IntoResponse for ResponseFormat<T> {
    fn into_response(self) -> axum::response::Response {
        let status = self.status;
        let body = Json(self);
        (status, body).into_response()
    }
}
