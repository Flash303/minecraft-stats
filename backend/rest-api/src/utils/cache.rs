use std::{collections::HashMap, hash::Hash, sync::Arc, time::Duration};

use tokio::{sync::RwLock, time::Instant};

#[derive(Clone)]
struct CacheEntry<V> {
    value: V,
    expires_at: Instant,
}

#[derive(Clone)]
pub struct TtlCache<K, V> {
    store: Arc<RwLock<HashMap<K, CacheEntry<V>>>>,
}

impl<K, V> TtlCache<K, V>
where
    K: Eq + Hash,
    V: Clone,
{
    pub fn new() -> Self {
        Self {
            store: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn insert(&self, key: K, value: V, ttl: Duration) {
        let expires_at = Instant::now() + ttl;
        let entry = CacheEntry { value, expires_at };

        let mut lock = self.store.write().await;
        lock.insert(key, entry);
    }

    pub async fn get(&self, key: &K) -> Option<V> {
        let read_lock = self.store.read().await;
        if let Some(entry) = read_lock.get(key) {
            if Instant::now() < entry.expires_at {
                return Some(entry.value.clone()); // Valid
            }
        }

        drop(read_lock);

        // Clear expired data
        let mut write_lock = self.store.write().await;
        if let Some(entry) = write_lock.get(key) {
            if Instant::now() >= entry.expires_at {
                write_lock.remove(key);
            }
        }

        None
    }
}
