use std::collections::HashMap;

use serde::Serialize;
use time::OffsetDateTime;

#[derive(Serialize)]
struct LokiPayload {
    streams: Vec<LokiStream>,
}

#[derive(Serialize)]
struct LokiStream {
    stream: HashMap<String, String>,
    values: Vec<[String; 2]>, // [Timestamp_Nano, Log_Message]
}

pub async fn send_to_loki(route: &str, method: &str, status: u16, duration: u128, request_size: u64, reponse_size: u64, ip: &str, user_id: Option<String>) {
    let log_content = serde_json::json!({
        "route": route,
        "method": method,
        "status": status,
        "request_size": request_size,
        "reponse_size": reponse_size,
        "duration_ms": duration,
        "ip": ip,
        "user_id": user_id
    }).to_string();

    let nanoseconds = OffsetDateTime::now_utc().unix_timestamp_nanos().to_string();

    let mut labels = HashMap::new();
    labels.insert("app".to_string(), "rest-api".to_string());

    let payload = LokiPayload {
        streams: vec![LokiStream {
            stream: labels,
            values: vec![[nanoseconds, log_content]],
        }],
    };

    tokio::spawn(async move {
        let client = reqwest::Client::new();
        let _ = client.post("http://loki:3100/loki/api/v1/push")
            .json(&payload)
            .send()
            .await;
    });
}
