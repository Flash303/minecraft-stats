use axum::{extract::State, Json};
use crate::{state::AppState, error::AppError};
use repository::models::mojang::MojangApiDowntime;
use serde::Serialize;

#[derive(Serialize)]
pub struct MojangStatusResponse {
    pub is_down: bool,
    pub downtimes: Vec<MojangApiDowntime>,
}

pub async fn get_status(State(state): State<AppState>) -> Result<Json<MojangStatusResponse>, AppError> {
    let is_down = state.repository.get_mojang_api_status().await?;
    let downtimes = state.repository.get_mojang_api_downtimes(50).await?;
    
    Ok(Json(MojangStatusResponse { is_down, downtimes }))
}
