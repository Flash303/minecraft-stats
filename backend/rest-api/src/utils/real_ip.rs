use std::net::SocketAddr;

use axum::http::HeaderMap;

pub fn get_client_ip(headers: &HeaderMap, fallback_addr: &SocketAddr) -> String {
    if let Some(cf_ip) = headers.get("cf-connecting-ip") {
        if let Ok(cf_ip_str) = cf_ip.to_str() {
            let trimmed = cf_ip_str.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    if let Some(xff) = headers.get("x-forwarded-for") {
        if let Ok(xff_str) = xff.to_str() {
            if let Some(client_ip) = xff_str.split(',').next() {
                let trimmed = client_ip.trim();
                if !trimmed.is_empty() {
                    return trimmed.to_string();
                }
            }
        }
    }

    if let Some(xri) = headers.get("x-real-ip") {
        if let Ok(xri_str) = xri.to_str() {
            let trimmed = xri_str.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }


    fallback_addr.ip().to_string()
}
