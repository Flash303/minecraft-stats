use crate::state::AppState;
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rsa::{pkcs1v15::Pkcs1v15Sign, BigUint, RsaPublicKey};
use sha2::{Digest, Sha256};
use crate::services::clerk::model::ClerkClaims;

pub async fn fetch_clerk_jwks(jwks_url: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let response = reqwest::get(jwks_url)
        .await?
        .error_for_status()?
        .json::<serde_json::Value>()
        .await?;

    Ok(response)
}

pub fn verify_clerk_token(state: &AppState, token: &str) -> Result<ClerkClaims, String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return Err("Invalid token format".to_string());
    }
    
    let header_b64 = parts[0];
    let claims_b64 = parts[1];
    let signature_b64 = parts[2];
    
    let kid = serde_json::from_slice::<serde_json::Value>(&URL_SAFE_NO_PAD.decode(header_b64).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?
        .get("kid").and_then(|k| k.as_str()).map(|s| s.to_string())
        .ok_or_else(|| "KID not found".to_string())?;

    let jwk = state.jwks.as_object()
        .and_then(|jwks| jwks.get("keys"))
        .and_then(|keys| keys.as_array())
        .and_then(|keys| keys.iter().find(|key| {
            key.get("kid").and_then(|k| k.as_str()) == Some(&kid)
        }))
        .ok_or_else(|| "Pubkey not found".to_string())?;

    let n = jwk.get("n").and_then(|v| v.as_str()).ok_or("Missing n")?;
    let e = jwk.get("e").and_then(|v| v.as_str()).ok_or("Missing e")?;
    
    let n_bytes = URL_SAFE_NO_PAD.decode(n).map_err(|e| e.to_string())?;
    let e_bytes = URL_SAFE_NO_PAD.decode(e).map_err(|e| e.to_string())?;

    let n_big = BigUint::from_bytes_be(&n_bytes);
    let e_big = BigUint::from_bytes_be(&e_bytes);

    let rsa_key = RsaPublicKey::new(n_big, e_big)
        .map_err(|e| format!("Key error: {}", e))?;

    // Verify signature
    let signed_content = format!("{}.{}", header_b64, claims_b64);
    let signature_bytes = URL_SAFE_NO_PAD.decode(signature_b64).map_err(|e| e.to_string())?;
    
    let hashed_content = Sha256::digest(signed_content.as_bytes());
    
    let verifier = Pkcs1v15Sign::new::<Sha256>();
    rsa_key.verify(verifier, &hashed_content, &signature_bytes)
        .map_err(|e| format!("Verification error: {}", e))?;

    // Deserialize claims
    let claims: ClerkClaims = serde_json::from_slice(&URL_SAFE_NO_PAD.decode(claims_b64).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Claims deserialization error: {}", e))?;

    // Validate issuer
    if claims.iss != state.clerk_instance_url.as_str() {
        return Err("Invalid issuer".to_string());
    }

    Ok(claims)
}