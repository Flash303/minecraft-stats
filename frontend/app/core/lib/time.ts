/** Shared durations in milliseconds (record timestamps are unix seconds). */
export const SECOND_MS = 1000;
export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;
export const WEEK_MS = 604_800_000;

export const INTERVAL_10S_MS = 10_000;
export const INTERVAL_1M_MS = MINUTE_MS;
export const INTERVAL_5M_MS = 300_000;
export const INTERVAL_30M_MS = 1_800_000;
export const INTERVAL_1H_MS = HOUR_MS;

export const RANGE_1H_MS = HOUR_MS;
export const RANGE_6H_MS = 6 * HOUR_MS;
export const RANGE_24H_MS = DAY_MS;
export const RANGE_7D_MS = WEEK_MS;
export const RANGE_30D_MS = 30 * DAY_MS;
export const RANGE_60D_MS = 60 * DAY_MS;

export const DEFAULT_RANGE_MS = RANGE_24H_MS;
export const DEFAULT_INTERVAL_MS = INTERVAL_1M_MS;
