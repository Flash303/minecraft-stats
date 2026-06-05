use jsonwebtoken::{decode, decode_header, jwk::JwkSet, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use crate::state::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClerkClaims {
    pub sub: String, // user id
    pub iss: String, // instance
    pub exp: u64,    // expiration
}

pub async fn fetch_clerk_jwks(jwks_url: &str) -> Result<JwkSet, Box<dyn std::error::Error>> {
    let response = reqwest::get(jwks_url)
        .await?
        .error_for_status()?
        .json::<JwkSet>()
        .await?;

    Ok(response)
}

pub fn verify_clerk_token(state: &AppState, token: &str) -> Result<ClerkClaims, String> {
    let header = decode_header(token)
        .map_err(|e| format!("Invalid header : {}", e))?;

    let kid = header.kid
        .ok_or_else(|| "KID not found".to_string())?;

    let jwk = state.jwks.find(&kid)
        .ok_or_else(|| "Pubkey not found inside the JWKSET".to_string())?;

    let decoding_key = DecodingKey::from_jwk(jwk)
        .map_err(|e| format!("Decoding error : {}", e))?;

    let mut validation = Validation::new(header.alg);
    validation.set_issuer(&[state.clerk_instance_url.as_ref()]);

    let token_data = decode::<ClerkClaims>(token, &decoding_key, &validation)
        .map_err(|e| format!("Invalid token : {}", e))?;

    Ok(token_data.claims)
}
