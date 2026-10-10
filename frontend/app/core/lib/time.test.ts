import { describe, it, expect } from "vitest"
import {
    SECOND_MS,
    MINUTE_MS,
    HOUR_MS,
    DAY_MS,
    WEEK_MS,
    INTERVAL_10S_MS,
    INTERVAL_1M_MS,
    INTERVAL_5M_MS,
    INTERVAL_30M_MS,
    INTERVAL_1H_MS,
    RANGE_1H_MS,
    RANGE_6H_MS,
    RANGE_24H_MS,
    RANGE_7D_MS,
    RANGE_30D_MS,
    RANGE_60D_MS,
    DEFAULT_RANGE_MS,
    DEFAULT_INTERVAL_MS,
} from "./time"

describe("time constants", () => {
    it("holds exact millisecond values", () => {
        expect(SECOND_MS).toBe(1000)
        expect(MINUTE_MS).toBe(60_000)
        expect(HOUR_MS).toBe(3_600_000)
        expect(DAY_MS).toBe(86_400_000)
        expect(WEEK_MS).toBe(604_800_000)
    })

    it("derives ranges and intervals consistently", () => {
        expect(INTERVAL_10S_MS).toBe(10_000)
        expect(INTERVAL_1M_MS).toBe(MINUTE_MS)
        expect(INTERVAL_5M_MS).toBe(300_000)
        expect(INTERVAL_30M_MS).toBe(1_800_000)
        expect(INTERVAL_1H_MS).toBe(HOUR_MS)
        expect(RANGE_1H_MS).toBe(HOUR_MS)
        expect(RANGE_6H_MS).toBe(6 * HOUR_MS)
        expect(RANGE_24H_MS).toBe(DAY_MS)
        expect(RANGE_7D_MS).toBe(WEEK_MS)
        expect(RANGE_30D_MS).toBe(30 * DAY_MS)
        expect(RANGE_60D_MS).toBe(60 * DAY_MS)
    })

    it("exposes the chart defaults", () => {
        expect(DEFAULT_RANGE_MS).toBe(RANGE_24H_MS)
        expect(DEFAULT_INTERVAL_MS).toBe(INTERVAL_1M_MS)
    })
})
