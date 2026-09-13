use crate::services::clients::lunar::{refresh_lunar_infos, refresh_lunar_partner_infos};
use crate::state::AppState;
use std::time::Duration;
use tokio::time::sleep;
use crate::services::clients::laby::{refresh_laby_infos, refresh_laby_partner_infos};

const FETCH_DELAY: Duration = Duration::from_hours(1);

pub fn start(state: AppState) {
    tokio::spawn(async move {
        loop {
            refresh_lunar_infos(&state).await;
            refresh_lunar_partner_infos(&state).await;

            refresh_laby_infos(&state).await;
            refresh_laby_partner_infos(&state).await;

            sleep(FETCH_DELAY).await;
        }
    });
}