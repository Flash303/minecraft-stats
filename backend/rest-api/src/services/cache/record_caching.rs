use std::collections::HashMap;
use redis::AsyncTypedCommands;
use crate::state::AppState;
use time::{Duration, Month, OffsetDateTime};
use repository::models::record::RecordData;

pub struct CachedRangesResult {
    pub percentage: f64,
    pub merged_ranges: Vec<(u32, u32)>,
    pub daily_ranges: HashMap<HumainDay, Vec<(u32, u32)>>,
    pub days: Vec<HumainDay>,
}

pub async fn get_cached_range(state: AppState,
                        id: u32,
                        from: OffsetDateTime,
                        to: OffsetDateTime) -> CachedRangesResult {
    let days = get_all_used_days(from, to);
    let daily_ranges = fetch_daily_ranges(state, id, &days).await;

    let mut all_ranges: Vec<(u32, u32)> = daily_ranges.values().flatten().copied().collect();
    let merged_ranges = merge_ranges(&mut all_ranges);

    let from_ts = from.unix_timestamp().max(0) as u32;
    let to_ts = to.unix_timestamp().max(0) as u32;

    let percentage = calculate_cached_percentage(&merged_ranges, from_ts, to_ts);

    CachedRangesResult {
        percentage,
        merged_ranges,
        daily_ranges,
        days
    }
}

async fn fetch_daily_ranges(state: AppState, id: u32, days: &[HumainDay]) -> HashMap<HumainDay, Vec<(u32, u32)>> {
    let mut redis_con = state.redis_client.get().await.unwrap();
    let mut daily_ranges = HashMap::new();

    for day in days {
        let key = format!("{}_{}", day.to_hash_key(), id);
        let mut day_ranges = Vec::new();

        let result: Result<HashMap<String, String>, _> = redis_con.hgetall(&key).await;
        if let Ok(map) = result {
            for (k, v) in map {
                if let (Ok(start), Ok(end)) = (k.parse::<u32>(), v.parse::<u32>()) {
                    day_ranges.push((start, end));
                }
            }
        }

        if !day_ranges.is_empty() {
            let merged_day_ranges = merge_ranges(&mut day_ranges);
            daily_ranges.insert(day.clone(), merged_day_ranges);
        }
    }

    daily_ranges
}

pub async fn cache_missing_records(state: AppState,
                                   id: u32,
                                   missing_ranges: Vec<(u32, u32)>,
                                   data: &RecordData) {
    let mut redis_con = state.redis_client.get().await.unwrap();
    let mut pipe = redis::pipe();
    
    for (ts, val) in data.0.iter().zip(data.1.iter()) {
        if let Ok(dt) = OffsetDateTime::from_unix_timestamp(*ts) {
            let day: HumainDay = dt.into();
            let key = format!("{}_{}", day.to_value_key(), id);
            pipe.zadd(key, val, *ts as u32).ignore();
        }
    }
    
    for (start, end) in missing_ranges {
        let mut current = start;
        while current < end {
            if let Ok(dt) = OffsetDateTime::from_unix_timestamp(current as i64) {
                let day: HumainDay = dt.into();
                let key = format!("{}_{}", day.to_hash_key(), id);
                
                // End of the current day (start of next day)
                let next_day_dt = dt.replace_time(time::Time::MIDNIGHT) + time::Duration::days(1);
                let next_day_ts = next_day_dt.unix_timestamp() as u32;
                
                let chunk_end = end.min(next_day_ts);
                
                pipe.hset(key, current, chunk_end).ignore();
                
                current = chunk_end;
            } else {
                break;
            }
        }
    }
    
    let _: Result<(), _> = pipe.query_async(&mut redis_con).await;
}

fn merge_ranges(ranges: &mut [(u32, u32)]) -> Vec<(u32, u32)> {
    if ranges.is_empty() {
        return Vec::new();
    }

    ranges.sort_unstable_by_key(|r| r.0);

    let mut merged: Vec<(u32, u32)> = Vec::with_capacity(ranges.len());
    for &range in ranges.iter() {
        if let Some(last) = merged.last_mut() {
            if last.1 >= range.0 {
                last.1 = last.1.max(range.1);
            } else {
                merged.push(range);
            }
        } else {
            merged.push(range);
        }
    }

    merged
}

fn calculate_cached_percentage(merged_ranges: &[(u32, u32)], from_ts: u32, to_ts: u32) -> f64 {
    if merged_ranges.is_empty() {
        return 0.0;
    }

    let mut total_covered: u32 = 0;
    for &(start, end) in merged_ranges {
        let intersection_start = start.max(from_ts);
        let intersection_end = end.min(to_ts);

        if intersection_end > intersection_start {
            total_covered += intersection_end - intersection_start;
        }
    }

    let total_requested = if to_ts > from_ts { to_ts - from_ts } else { 1 };

    let percentage = (total_covered as f64 / total_requested as f64) * 100.0;
    percentage.min(100.0)
}

#[derive(Clone, Eq, PartialEq, Hash)]
pub struct HumainDay {
    pub day: u8,
    pub month: Month,
    pub year: i32
}

impl HumainDay {
    pub fn to_hash_key(&self) -> String {
        self.to_key("hash")
    }

    pub fn to_value_key(&self) -> String {
        self.to_key("value")
    }

    fn to_key(&self, prefix: &str) -> String {
        format!("{prefix}_{}_{}_{}", self.day, self.month, self.year)
    }
}

impl From<OffsetDateTime> for HumainDay {
    fn from(value: OffsetDateTime) -> Self {
        Self {
            day: value.day(),
            month: value.month(),
            year: value.year()
        }
    }
}

pub fn get_all_used_days(from: OffsetDateTime,
                     to: OffsetDateTime) -> Vec<HumainDay> {
    let diff: Duration = to - from;
    let nb_day = diff.whole_days();

    let mut all_days: Vec<HumainDay> = Vec::with_capacity(nb_day as usize);
    for i in 0..=nb_day {
        let current_date = from + Duration::days(i);
        all_days.push(current_date.into());
    }

    all_days
}