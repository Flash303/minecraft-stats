use sha2::{Sha256, Digest};
use hickory_resolver::TokioResolver;
use std::net::IpAddr;
use crate::models::server::Server;
use crate::repository::Repository;

const SIGNAL_WEIGHTS_FAVICON: u32 = 50;
const SIGNAL_WEIGHTS_ENDPOINT: u32 = 40;
const SIGNAL_WEIGHTS_MOTD: u32 = 30;
const SIGNAL_WEIGHTS_VERSION: u32 = 8;

const DUPLICATE_THRESHOLD: u32 = 75;
const SHARED_ENDPOINT_LIMIT: u32 = 2;

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
    pub signals: Vec<String>,
}

pub struct DuplicateDetectionService;

impl DuplicateDetectionService {
    pub fn hash_favicon(favicon: Option<&str>) -> Option<String> {
        let favicon = favicon?;
        let base64 = favicon.split(',').last()?.trim();
        if base64.is_empty() { return None; }

        let mut hasher = Sha256::new();
        hasher.update(base64.as_bytes());
        Some(hex::encode(hasher.finalize()))
    }

    pub fn flatten_motd(node: &serde_json::Value) -> String {
        match node {
            serde_json::Value::String(s) => s.clone(),
            serde_json::Value::Array(arr) => arr.iter().map(Self::flatten_motd).collect(),
            serde_json::Value::Object(obj) => {
                let mut text = obj.get("text").and_then(|v| v.as_str()).unwrap_or("").to_string();
                if let Some(extra) = obj.get("extra") {
                    text += &Self::flatten_motd(extra);
                }
                text
            },
            _ => String::new(),
        }
    }

    pub fn hash_motd(motd: Option<&serde_json::Value>) -> Option<String> {
        let motd = motd?;
        let flattened = Self::flatten_motd(motd);
        
        // Remove color codes (§x) and digits
        let re_color = regex::Regex::new("§.").unwrap();
        let re_digits = regex::Regex::new("\\d").unwrap();
        
        let normalized = re_digits.replace_all(
            &re_color.replace_all(&flattened, ""), 
            ""
        ).to_lowercase();
        
        let normalized = normalized.split_whitespace().collect::<Vec<_>>().join(" ");
        let normalized = normalized.trim();
        
        if normalized.chars().count() < 4 { return None; }
        
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        Some(hex::encode(hasher.finalize()))
    }

    pub async fn resolve_endpoint(address: &str, port: u16) -> Option<String> {
        if address.parse::<IpAddr>().is_ok() {
            return Some(format!("{}:{}", address, port));
        }

        let builder = match TokioResolver::builder_tokio() {
            Ok(b) => b,
            Err(_) => return None,
        };
        let resolver = match builder.build() {
            Ok(r) => r,
            Err(_) => return None,
        };
        
        // 1. SRV
        let srv_name = format!("_minecraft._tcp.{}", address);
        let mut target_host = address.to_string();
        let mut target_port = port;
        
        if let Ok(srv) = resolver.srv_lookup(&srv_name).await {
            let srv_records: Vec<_> = srv.answers().iter()
                .filter_map(|record| {
                    if let hickory_proto::rr::RData::SRV(srv) = &record.data {
                        Some(srv)
                    } else {
                        None
                    }
                })
                .collect();
            
            if let Some(best) = srv_records.into_iter().min_by_key(|r| r.priority) {
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
    ) -> Result<Option<DuplicateMatch>, String> {
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
            let mut signals = Vec::new();

            if let (Some(h1), Some(h2)) = (favicon_hash, &candidate.favicon_hash) {
                if h1 == h2 {
                    score += SIGNAL_WEIGHTS_FAVICON;
                    signals.push("favicon".to_string());
                }
            }

            if endpoint_trusted {
                if let (Some(e1), Some(e2)) = (resolved_endpoint, &candidate.resolved_endpoint) {
                    if e1 == e2 {
                        score += SIGNAL_WEIGHTS_ENDPOINT;
                        signals.push("endpoint".to_string());
                    }
                }
            }

            if let (Some(m1), Some(m2)) = (motd_hash, &candidate.motd_hash) {
                if m1 == m2 {
                    score += SIGNAL_WEIGHTS_MOTD;
                    signals.push("motd".to_string());
                }
            }

            if let (Some(v1), Some(v2)) = (version, &candidate.last_version) {
                if v1 == v2 {
                    score += SIGNAL_WEIGHTS_VERSION;
                    signals.push("version".to_string());
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
