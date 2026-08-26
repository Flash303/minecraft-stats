use std::net::{IpAddr, SocketAddr};

use axum::extract::ConnectInfo;
use axum::http::{HeaderMap, Request};
use tower_governor::errors::GovernorError;
use tower_governor::key_extractor::KeyExtractor;

/// Rate-limit key extractor trusting only sources a client cannot forge:
/// `cf-connecting-ip` (always overwritten by Cloudflare), falling back to the
/// peer address for direct connections.
///
/// Unlike `SmartIpKeyExtractor`, `X-Forwarded-For`, `X-Real-IP` and `Forwarded`
/// are deliberately ignored: any client can set them, and Cloudflare appends
/// the visitor IP to `X-Forwarded-For` instead of replacing it, so a forged
/// first value survives the proxy and defeats per-IP limiting.
///
/// Assumption: the origin is only reachable through Cloudflare (or a trusted
/// proxy setting `cf-connecting-ip`). If the origin ever becomes publicly
/// reachable, an attacker could rotate fake `cf-connecting-ip` values; proxy
/// IP allowlisting would then be required.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ClientIpKeyExtractor;

impl KeyExtractor for ClientIpKeyExtractor {
    type Key = IpAddr;

    fn extract<T>(&self, req: &Request<T>) -> Result<Self::Key, GovernorError> {
        cf_connecting_ip(req.headers())
            .or_else(|| connect_info_ip(req))
            .ok_or(GovernorError::UnableToExtractKey)
    }
}

fn cf_connecting_ip(headers: &HeaderMap) -> Option<IpAddr> {
    headers
        .get("cf-connecting-ip")
        .and_then(|hv| hv.to_str().ok())
        .and_then(|s| s.trim().parse::<IpAddr>().ok())
}

fn connect_info_ip<T>(req: &Request<T>) -> Option<IpAddr> {
    req.extensions()
        .get::<ConnectInfo<SocketAddr>>()
        .map(|addr| addr.ip())
}
