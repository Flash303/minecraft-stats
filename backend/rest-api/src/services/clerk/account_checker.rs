use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use rsa::{pkcs1v15::Pkcs1v15Sign, BoxedUint, RsaPublicKey};
use sha2::{Digest, Sha256};

use crate::services::clerk::model::ClerkClaims;
use crate::state::AppState;

// Grace time
const CLAIMS_LEEWAY_SECS: u64 = 5;
const JWKS_REFRESH_COOLDOWN: Duration = Duration::from_secs(60);

#[derive(Clone)]
pub struct JwksStore {
    jwks_url: String,
    slot: Arc<RwLock<JwksSlot>>,
}

struct JwksSlot {
    keys: Arc<serde_json::Value>,
    fetched_at: Instant,
}

impl JwksStore {
    pub fn new(jwks_url: String, initial_keys: serde_json::Value) -> Self {
        Self {
            jwks_url,
            slot: Arc::new(RwLock::new(JwksSlot {
                keys: Arc::new(initial_keys),
                fetched_at: Instant::now(),
            })),
        }
    }

    fn keys(&self) -> Arc<serde_json::Value> {
        self.slot.read().unwrap().keys.clone()
    }

    /// Returns the JWK matching `kid`. In steady state this is a pure cache
    /// hit: nothing is ever fetched. When the kid is unknown (Clerk key
    /// rotation), the JWKS is refreshed once and the lookup retried. Refreshes
    /// happen on demand only, and are rate-limited by [`JWKS_REFRESH_COOLDOWN`].
    ///
    /// Locks are std RwLocks held only across tiny critical sections; the
    /// network fetch runs without any lock held.
    pub async fn resolve_jwk(&self, kid: &str) -> Result<serde_json::Value, String> {
        if let Some(jwk) = find_jwk(&self.keys(), kid) {
            return Ok(jwk.clone());
        }

        {
            let slot = self.slot.read().unwrap();
            if slot.fetched_at.elapsed() < JWKS_REFRESH_COOLDOWN {
                return Err("Pubkey not found".to_string());
            }
        }

        let fresh = fetch_clerk_jwks(&self.jwks_url)
            .await
            .map_err(|e| format!("JWKS refresh failed: {}", e))?;
        let fresh = Arc::new(fresh);

        let mut slot = self.slot.write().unwrap();

        // Double-check: a concurrent request may have refreshed meanwhile.
        if let Some(jwk) = find_jwk(&slot.keys, kid) {
            return Ok(jwk.clone());
        }

        slot.fetched_at = Instant::now();
        slot.keys = fresh;

        find_jwk(&slot.keys, kid).cloned()
            .ok_or_else(|| "Pubkey not found".to_string())
    }
}

fn find_jwk<'a>(jwks: &'a serde_json::Value, kid: &'a str) -> Option<&'a serde_json::Value> {
    jwks.as_object()
        .and_then(|jwks| jwks.get("keys"))
        .and_then(|keys| keys.as_array())
        .and_then(|keys| keys.iter().find(|key| {
            key.get("kid").and_then(|k| k.as_str()) == Some(kid)
        }))
}

pub async fn fetch_clerk_jwks(jwks_url: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    let response = reqwest::get(jwks_url)
        .await?
        .error_for_status()?
        .json::<serde_json::Value>()
        .await?;

    Ok(response)
}

pub async fn verify_clerk_token(state: &AppState, token: &str) -> Result<ClerkClaims, String> {
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

    let jwk = state.jwks.resolve_jwk(&kid).await?;

    let n = jwk.get("n").and_then(|v| v.as_str()).ok_or("Missing n")?;
    let e = jwk.get("e").and_then(|v| v.as_str()).ok_or("Missing e")?;
    
    let n_bytes = URL_SAFE_NO_PAD.decode(n).map_err(|e| e.to_string())?;
    let e_bytes = URL_SAFE_NO_PAD.decode(e).map_err(|e| e.to_string())?;

    let n_bits = (n_bytes.len() * 8) as u32;
    let e_bits = (e_bytes.len() * 8) as u32;

    let n_big = BoxedUint::from_be_slice(&n_bytes, n_bits)
        .map_err(|e| format!("Parsing N error: {}", e))?;
    let e_big = BoxedUint::from_be_slice(&e_bytes, e_bits)
        .map_err(|e| format!("Parsing E error: {}", e))?;

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

    validate_claims_time_window(&claims)?;

    // Validate issuer
    if claims.iss != state.clerk_instance_url.as_str() {
        return Err("Invalid issuer".to_string());
    }

    Ok(claims)
}

fn validate_claims_time_window(claims: &ClerkClaims) -> Result<(), String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "System clock error".to_string())?
        .as_secs();

    if now.saturating_sub(CLAIMS_LEEWAY_SECS) >= claims.exp {
        return Err("Token expired".to_string());
    }

    if let Some(nbf) = claims.nbf.as_ref().and_then(|v| v.as_u64()) {
        if now.saturating_add(CLAIMS_LEEWAY_SECS) < nbf {
            return Err("Token not yet valid".to_string());
        }
    }

    Ok(())
}
