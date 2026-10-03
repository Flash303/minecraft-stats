use sha2::{Sha256, Digest};
use hickory_resolver::TokioResolver;
use std::net::IpAddr;
use hickory_proto::rr::RData;
use serde_json::Value;
use std::sync::LazyLock;
use crate::error::RepositoryError;
use crate::models::server::Server;
use crate::repository::Repository;

const SIGNAL_WEIGHTS_FAVICON: u32 = 50;
const SIGNAL_WEIGHTS_ENDPOINT: u32 = 40;
const SIGNAL_WEIGHTS_MOTD: u32 = 30;
const SIGNAL_WEIGHTS_VERSION: u32 = 8;

const DUPLICATE_THRESHOLD: u32 = 75;
const SHARED_ENDPOINT_LIMIT: u32 = 2;

static DNS_RESOLVER: LazyLock<Option<TokioResolver>> = LazyLock::new(|| {
    TokioResolver::builder_tokio().ok()?.build().ok()
});

#[derive(Debug, Clone)]
pub struct ServerFingerprint {
    pub favicon_hash: Option<String>,
    pub resolved_endpoint: Option<String>,
    pub motd_hash: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug)]
pub struct DuplicateMatch {
    pub server: Server,
    pub score: u32,
    pub signals: Vec<&'static str>,
}

pub struct DuplicateDetectionService;

impl DuplicateDetectionService {
    pub fn hash_favicon(favicon: Option<&str>) -> Option<String> {
        let favicon = favicon?;
        let base64 = match favicon.rfind(',') {
            Some(idx) => favicon[idx + 1..].trim(),
            None => favicon.trim(),
        };
        if base64.is_empty() { return None; }

        let mut hasher = Sha256::new();
        hasher.update(base64.as_bytes());
        Some(hex::encode(hasher.finalize()))
    }

    fn flatten_motd_into(node: &Value, buf: &mut String) {
        match node {
            Value::String(s) => buf.push_str(s),
            Value::Array(arr) => {
                for item in arr {
                    Self::flatten_motd_into(item, buf);
                }
            }
            Value::Object(obj) => {
                if let Some(text) = obj.get("text").and_then(|v| v.as_str()) {
                    buf.push_str(text);
                }
                if let Some(extra) = obj.get("extra") {
                    Self::flatten_motd_into(extra, buf);
                }
            }
            _ => {}
        }
    }

    pub fn hash_motd(motd: Option<&Value>) -> Option<String> {
        let motd = motd?;

        let mut flattened = String::with_capacity(128);
        Self::flatten_motd_into(motd, &mut flattened);

        let mut chars = flattened.chars().peekable();
        let mut cleaned = String::with_capacity(flattened.len());

        while let Some(c) = chars.next() {
            if c == '§' {
                chars.next(); // Ignore le code de couleur qui suit
                continue;
            }
            if !c.is_ascii_digit() {
                cleaned.push(c);
            }
        }

        let mut normalized = String::with_capacity(cleaned.len());
        for word in cleaned.to_lowercase().split_whitespace() {
            if !normalized.is_empty() {
                normalized.push(' ');
            }
            normalized.push_str(word);
        }

        if normalized.chars().count() < 4 { return None; }

        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        Some(hex::encode(hasher.finalize()))
    }

    pub async fn resolve_endpoint(address: &str, port: u16) -> Option<String> {
        if address.parse::<IpAddr>().is_ok() {
            return Some(format!("{}:{}", address, port));
        }

        let resolver = DNS_RESOLVER.as_ref()?;

        // 1. SRV
        let srv_name = format!("_minecraft._tcp.{}", address);
        let mut target_host = address.to_string();
        let mut target_port = port;

        if let Ok(srv) = resolver.srv_lookup(&srv_name).await {
            let best_srv = srv.answers().iter().filter_map(|record| {
                if let RData::SRV(srv) = &record.data {
                    Some(srv)
                } else {
                    None
                }
            }).min_by_key(|r| r.priority);

            if let Some(best) = best_srv {
                target_host = best.target.to_utf8().trim_end_matches('.').to_string();
                target_port = best.port;
            }
        }

        if target_host.parse::<IpAddr>().is_ok() {
            return Some(format!("{}:{}", target_host, target_port));
        }

        // 2. A/AAAA
        let ips = resolver.lookup_ip(&target_host).await.ok()?;
        let mut ips: Vec<IpAddr> = ips.iter().collect();
        ips.sort();

        ips.first().map(|ip| format!("{}:{}", ip, target_port))
    }

    pub async fn find_duplicate(
        repository: &dyn Repository,
        fingerprint: &ServerFingerprint,
        exclude_id: Option<u32>,
    ) -> Result<Option<DuplicateMatch>, RepositoryError> {
        let ServerFingerprint {
            favicon_hash,
            resolved_endpoint,
            motd_hash,
            version,
        } = fingerprint;

        if favicon_hash.is_none() && resolved_endpoint.is_none() && motd_hash.is_none() {
            return Ok(None);
        }

        let mut endpoint_trusted = false;
        if let Some(endpoint) = resolved_endpoint {
            let count = repository.count_resolved_endpoints(endpoint, exclude_id).await?;
            endpoint_trusted = count < SHARED_ENDPOINT_LIMIT;
        }

        let has_discriminating = favicon_hash.is_some()
            || (resolved_endpoint.is_some() && endpoint_trusted)
            || motd_hash.is_some();

        if !has_discriminating {
            return Ok(None);
        }

        let candidates = repository.find_servers(
            favicon_hash.as_deref(),
            if endpoint_trusted { resolved_endpoint.as_deref() } else { None },
            motd_hash.as_deref(),
        ).await?;

        let mut best: Option<DuplicateMatch> = None;

        for candidate in candidates {
            if Some(candidate.id) == exclude_id {
                continue;
            }

            let mut score = 0;
            let mut signals = Vec::with_capacity(4);

            if let (Some(h1), Some(h2)) = (favicon_hash, &candidate.favicon_hash) {
                if h1 == h2 {
                    score += SIGNAL_WEIGHTS_FAVICON;
                    signals.push("favicon");
                }
            }

            if endpoint_trusted {
                if let (Some(e1), Some(e2)) = (resolved_endpoint, &candidate.resolved_endpoint) {
                    if e1 == e2 {
                        score += SIGNAL_WEIGHTS_ENDPOINT;
                        signals.push("endpoint");
                    }
                }
            }

            if let (Some(m1), Some(m2)) = (motd_hash, &candidate.motd_hash) {
                if m1 == m2 {
                    score += SIGNAL_WEIGHTS_MOTD;
                    signals.push("motd");
                }
            }

            if let (Some(v1), Some(v2)) = (version, &candidate.last_version) {
                if v1 == v2 {
                    score += SIGNAL_WEIGHTS_VERSION;
                    signals.push("version");
                }
            }

            if score >= DUPLICATE_THRESHOLD {
                if best.as_ref().map_or(true, |b| score > b.score) {
                    best = Some(DuplicateMatch {
                        server: candidate,
                        score,
                        signals,
                    });
                }
            }
        }

        Ok(best)
    }
}