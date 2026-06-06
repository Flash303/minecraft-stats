
use regex::Regex;

/// Extracts the first and last version numbers from a version string.
/// Returns None if no version numbers are found.
pub fn parse_minecraft_version_range(version_name: &str) -> Option<(String, String)> {
    // This regex matches version-like strings such as 1.8, 1.8.9, 1.21.11
    // It is quite permissive as Minecraft versioning is complex.
    let re = Regex::new(r"\d+\.\d+(?:\.\d+)?").unwrap();
    let matches: Vec<String> = re
        .find_iter(version_name)
        .map(|m| m.as_str().to_string())
        .collect();

    if matches.is_empty() {
        return None;
    }

    let first = matches.first()?.clone();
    let last = matches.last()?.clone();

    Some((first, last))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_minecraft_version_range() {
        assert_eq!(parse_minecraft_version_range("Waterfall 1.8.x, 1.9.x, 1.10.x"), Some(("1.8".to_string(), "1.10".to_string())));
        assert_eq!(parse_minecraft_version_range("Velocity 1.7.2-1.21.11"), Some(("1.7.2".to_string(), "1.21.11".to_string())));
        assert_eq!(parse_minecraft_version_range("1.21.7+"), Some(("1.21.7".to_string(), "1.21.7".to_string())));
        assert_eq!(parse_minecraft_version_range("Requires MC 1.8 / 1.21"), Some(("1.8".to_string(), "1.21".to_string())));
        assert_eq!(parse_minecraft_version_range("Velocity 1.7.2-26.1.2"), Some(("1.7.2".to_string(), "26.1.2".to_string())));
        assert_eq!(parse_minecraft_version_range("No version here"), None);
    }
}
