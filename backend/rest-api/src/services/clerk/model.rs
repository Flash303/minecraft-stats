use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClerkClaims {
    /// Unique identifier for the user
    pub sub: String,

    pub is_admin: Option<bool>,

    /// The instance URL of the Clerk application
    pub iss: String,
    /// Expiration time (Unix timestamp)
    pub exp: u64,
    /// Issued at (Unix timestamp)
    pub iat: Option<serde_json::Value>,
    /// Original issued at (Unix timestamp, useful for session lifetime tracking)
    pub oiat: Option<serde_json::Value>,
    /// Not before (Unix timestamp)
    pub nbf: Option<serde_json::Value>,
    /// Session ID
    pub sid: Option<String>,
    /// Authorized party
    pub azp: Option<String>,
    /// Version
    pub v: Option<serde_json::Value>,
    /// Session status
    pub sts: Option<String>,
    /// Feature version array
    #[serde(default)]
    pub fva: Vec<serde_json::Value>,
}

impl ClerkClaims {
    pub fn id(&self) -> &String {
        &self.sub
    }

    pub fn is_admin(&self) -> bool {
        self.is_admin.unwrap_or(false)
    }
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ClerkUser {
    pub id: String,
    pub username: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,

    pub image_url: Option<String>,
    pub has_image: bool,
}
