use crate::services::clients::BaseClientInfo;
use serde::Serialize;

#[derive(Serialize)]
pub struct LabyClientInfo {
    #[serde(flatten)]
    base: BaseClientInfo
}