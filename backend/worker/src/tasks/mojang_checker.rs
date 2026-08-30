use crate::DELAY_BETWEEN_EACH_PING;
use repository::repository::Repository;
use std::time::{Duration, Instant};
use log::{info, error, warn};
use time::OffsetDateTime;
use openssl::sha::Sha1;
use openssl::rand::rand_bytes;
use tokio::time::sleep;

const REQUIRED_FAILURES: u8 = 3;

fn generate_minecraft_hash(server_id: &str, shared_secret: &[u8], public_key: &[u8]) -> String {
    let mut hasher = Sha1::new();
    hasher.update(server_id.as_bytes());
    hasher.update(shared_secret);
    hasher.update(public_key);
    let digest = hasher.finish();

    let is_negative = (digest[0] & 0x80) != 0;
    
    let hex_str = if is_negative {
        let mut carry = true;
        let mut inverted = [0u8; 20];
        for i in (0..20).rev() {
            let mut val = !digest[i];
            if carry {
                let (new_val, new_carry) = val.overflowing_add(1);
                val = new_val;
                carry = new_carry;
            }
            inverted[i] = val;
        }
        format!("-{}", hex::encode(inverted).trim_start_matches('0'))
    } else {
        hex::encode(digest).trim_start_matches('0').to_string()
    };
    
    if hex_str.is_empty() || hex_str == "-" {
        "0".to_string()
    } else {
        hex_str
    }
}

pub async fn mojang_checker_worker(repository: impl Repository + Clone) {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(4))
        .build()
        .unwrap();

    let mut consecutive_failures = 0;
    loop {
        let count_time = Instant::now();

        let mut shared_secret = [0u8; 16];
        let mut public_key = [0u8; 128];
        if rand_bytes(&mut shared_secret).is_err() || rand_bytes(&mut public_key).is_err() {
            error!("Failed to generate random bytes for Mojang check");
            sleep_for_remaining(count_time).await;
            continue;
        }

        let hash = generate_minecraft_hash("", &shared_secret, &public_key);
        let url = format!(
            "https://sessionserver.mojang.com/session/minecraft/hasJoined?username=Notch&serverId={}",
            hash
        );

        let mut is_currently_down = false;

        match client.get(&url).send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_server_error() {
                    warn!("Mojang API returned server error: {}", status);
                    is_currently_down = true;
                }
            },
            Err(e) => {
                warn!("Failed to reach Mojang API: {}", e);
                is_currently_down = true;
            }
        };

        if is_currently_down {
            consecutive_failures += 1;
        } else {
            consecutive_failures = 0;
        }

        let is_confirmed_down = consecutive_failures >= REQUIRED_FAILURES;

        match repository.get_mojang_api_status().await {
            Ok(db_is_down) => {
                if is_confirmed_down && !db_is_down {
                    info!("Mojang Session API went DOWN ({} consecutive failures)", consecutive_failures);
                    let _ = repository.set_mojang_api_status(true).await;
                    let _ = repository.start_mojang_api_downtime(OffsetDateTime::now_utc()).await;
                } else if !is_currently_down && db_is_down {
                    info!("Mojang Session API is back UP");
                    let _ = repository.set_mojang_api_status(false).await;
                    let _ = repository.end_mojang_api_downtime(OffsetDateTime::now_utc()).await;
                }
            }
            Err(e) => error!("Failed to get Mojang API status from DB: {}", e),
        }

        sleep_for_remaining(count_time).await;
    }
}

async fn sleep_for_remaining(start_time: Instant) {
    let remaining_delay = DELAY_BETWEEN_EACH_PING
        .checked_sub(start_time.elapsed())
        .unwrap_or(Duration::ZERO);
    sleep(remaining_delay).await;
}
