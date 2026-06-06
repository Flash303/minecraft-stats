use sha2::{Sha256, Digest};
use hickory_resolver::TokioResolver;
use std::net::IpAddr;
use base64::{Engine as _, engine::general_purpose};

pub struct DuplicateDetectionService;

impl DuplicateDetectionService {
    pub fn hash_favicon(favicon: Option<&str>) -> Option<String> {
        let favicon = favicon?;
        let base64 = favicon.split(',').last()?.trim();
        if base64.is_empty() { return None; }

        let decoded = general_purpose::STANDARD.decode(base64).ok()?;

        let mut hasher = Sha256::new();
        hasher.update(decoded);
        Some(hex::encode(hasher.finalize()))
    }
// ... rest of file
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
        
        if normalized.len() < 4 { return None; }
        
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
}
