use std::collections::HashSet;
use std::hash::Hash;

pub fn deduplicate<T>(values: Vec<T>) -> Vec<T>
where
    T: Eq + Hash + Clone,
{
    let mut seen = HashSet::new();
    values
        .into_iter()
        .filter(|v| seen.insert(v.clone()))
        .collect()
}

pub fn deduplicate_in_place<T>(values: &mut Vec<T>)
where
    T: Eq + Hash + Clone,
{
    let mut seen = HashSet::new();
    values.retain(|v| seen.insert(v.clone()));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deduplicate_removes_duplicates_preserving_order() {
        assert_eq!(deduplicate(vec![1, 2, 1, 3, 2]), vec![1, 2, 3]);
    }

    #[test]
    fn deduplicate_in_place_removes_duplicates() {
        let mut values = vec![1, 2, 1, 3, 2];
        deduplicate_in_place(&mut values);
        assert_eq!(values, vec![1, 2, 3]);
    }
}
