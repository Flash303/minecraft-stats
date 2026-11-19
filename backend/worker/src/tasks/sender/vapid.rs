use std::{env, io::Cursor};

use repository::models::web_push::WebPushSubscription;
use web_push::{
    PartialVapidSignatureBuilder, SubscriptionInfo, VapidSignature, VapidSignatureBuilder,
};

use crate::tasks::sender::SenderTask;

const PRIVATE_KEY_START: &str = "-----BEGIN";
const PRIVATE_KEY_END: &str = "-----END";

impl SenderTask {
    pub(super) fn create_vapid_builder(
        private_key: &str,
    ) -> Result<PartialVapidSignatureBuilder, &'static str> {
        let trimmed = private_key.trim();
        if trimmed.is_empty() {
            return Err("Key empty");
        }

        if trimmed.starts_with(PRIVATE_KEY_START) {
            if !trimmed.contains(PRIVATE_KEY_END) {
                return Err("Invalid pem key");
            }

            return VapidSignatureBuilder::from_pem_no_sub(Cursor::new(trimmed.as_bytes()))
                .map_err(|_| "Could not create the VAPID signature from PEM");
        }

        let normalized = to_b64url(trimmed);
        let is_valid_b64_chars = normalized
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_');

        if normalized.len() == 43 && is_valid_b64_chars {
            return VapidSignatureBuilder::from_base64_no_sub(&normalized)
                .map_err(|_| "Could not parse from base64");
        }

        Err("Incorrect key format / length")
    }

    pub(super) fn retrieve_private_key() -> Result<String, &'static str> {
        let key = env::var("VAPID_PRIVATE_KEY").map_err(|_| "VAPID_PRIVATE_KEY is not set")?;
        if key.trim().is_empty() {
            return Err("VAPID_PRIVATE_KEY is empty");
        }

        Ok(key)
    }

    pub(super) fn subscription_info(subscription: &WebPushSubscription) -> SubscriptionInfo {
        SubscriptionInfo::new(
            subscription.endpoint.as_str(),
            &to_b64url(&subscription.p256dh),
            &to_b64url(&subscription.auth),
        )
    }

    pub(super) fn sign(
        builder: &PartialVapidSignatureBuilder,
        subscription_info: &SubscriptionInfo,
        mailto: &str,
    ) -> Result<VapidSignature, String> {
        let mut signature_builder = builder.clone().add_sub_info(subscription_info);
        signature_builder.add_claim("sub", mailto);

        signature_builder.build().map_err(|e| {
            format!(
                "Sender error signing VAPID claims for {}: {:?}",
                subscription_info.endpoint, e
            )
        })
    }
}

fn to_b64url(value: &str) -> String {
    value
        .trim()
        .trim_end_matches('=')
        .replace('+', "-")
        .replace('/', "_")
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_PRIVATE_KEY_PEM: &str = "-----BEGIN EC PRIVATE KEY-----\n\
        MHcCAQEEIBfU5jZuN+r7MegcTJPK2+CAanRpppsTx9fQoUcLYNRgoAoGCCqGSM49\n\
        AwEHoUQDQgAEBQichdJasclGlxecNXoqFEhg0HmV7+sfqjVSRDn8DbZeH57qngA1\n\
        d3vZJG9Qb9sFXdMzFc+9HA7ZXCOHFlqxCg==\n\
        -----END EC PRIVATE KEY-----\n";

    const TEST_PRIVATE_KEY_B64: &str = "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY";

    const TEST_PRIVATE_KEY_STD_B64: &str = "spI0C6PN/eGfUd6cJhP/Q4qVBQC5vicjLWm+6bPNFY0=";

    fn key_error(key: &str) -> &'static str {
        match SenderTask::create_vapid_builder(key) {
            Ok(_) => panic!("key should have been rejected: {key:?}"),
            Err(e) => e,
        }
    }

    #[test]
    fn accepts_base64url_key() {
        assert!(SenderTask::create_vapid_builder(TEST_PRIVATE_KEY_B64).is_ok());
    }

    #[test]
    fn accepts_padded_base64url_key() {
        let padded = format!("{TEST_PRIVATE_KEY_B64}=");
        assert!(SenderTask::create_vapid_builder(&padded).is_ok());
    }

    #[test]
    fn accepts_standard_base64_key() {
        let unpadded = TEST_PRIVATE_KEY_STD_B64.trim_end_matches('=');
        assert!(unpadded.contains('+') && unpadded.contains('/'));

        let urlsafe = unpadded.replace('+', "-").replace('/', "_");
        assert!(SenderTask::create_vapid_builder(unpadded).is_ok());
        assert!(SenderTask::create_vapid_builder(&urlsafe).is_ok());
    }

    #[test]
    fn accepts_padded_standard_base64_key() {
        assert!(SenderTask::create_vapid_builder(TEST_PRIVATE_KEY_STD_B64).is_ok());
    }

    #[test]
    fn accepts_surrounding_whitespace() {
        let key = format!("\n  {TEST_PRIVATE_KEY_B64}  \n");
        assert!(SenderTask::create_vapid_builder(&key).is_ok());
    }

    #[test]
    fn accepts_pem_key() {
        assert!(SenderTask::create_vapid_builder(TEST_PRIVATE_KEY_PEM).is_ok());
    }

    #[test]
    fn rejects_empty_key() {
        assert_eq!(key_error(""), "Key empty");
        assert_eq!(key_error("  \n\t "), "Key empty");
    }

    #[test]
    fn rejects_wrong_length() {
        assert_eq!(
            key_error(&TEST_PRIVATE_KEY_B64[..42]),
            "Incorrect key format / length"
        );

        let long = format!("{TEST_PRIVATE_KEY_B64}a");
        assert_eq!(key_error(&long), "Incorrect key format / length");
    }

    #[test]
    fn rejects_invalid_characters() {
        let key = format!("{}!", &TEST_PRIVATE_KEY_B64[..42]);
        assert_eq!(key_error(&key), "Incorrect key format / length");
    }

    #[test]
    fn rejects_pem_without_end_marker() {
        let key = "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEE\n";
        assert_eq!(key_error(key), "Invalid pem key");
    }

    #[test]
    fn rejects_broken_pem() {
        let key = "-----BEGIN EC PRIVATE KEY-----\nnot-a-pem-body\n-----END EC PRIVATE KEY-----\n";
        assert_eq!(
            key_error(key),
            "Could not create the VAPID signature from PEM"
        );
    }

    #[test]
    fn normalizes_b64url_values() {
        assert_eq!(to_b64url("a+b/c=="), "a-b_c");
        assert_eq!(to_b64url("  a-b_c\n"), "a-b_c");
        assert_eq!(to_b64url("abc"), "abc");
    }
}
