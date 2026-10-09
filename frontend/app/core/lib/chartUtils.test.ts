import { describe, it, expect } from "vitest"
import {
    prepareSingleChartData,
    prepareMultiChartData,
    formatAxisTick,
    getTimeRanges,
    getIntervals,
} from "./chartUtils"
import type { Server } from "./api"
import {
    RANGE_1H_MS,
    RANGE_6H_MS,
    RANGE_24H_MS,
    RANGE_7D_MS,
    RANGE_30D_MS,
    RANGE_60D_MS,
    INTERVAL_10S_MS,
    INTERVAL_1M_MS,
    INTERVAL_5M_MS,
    INTERVAL_30M_MS,
    INTERVAL_1H_MS,
} from "./time"

const server = (id: number): Server => ({ id }) as unknown as Server
const key = (k: string) => k

describe("prepareSingleChartData", () => {
    it("returns empty aligned data for empty input", () => {
        expect(prepareSingleChartData([], 60_000)).toEqual([[], []])
    })

    it("sorts points and injects null gaps beyond twice the interval", () => {
        const data = [
            { date: 2000, value: 30 },
            { date: 1000, value: 10 },
            { date: 1060, value: 20 },
        ]
        expect(prepareSingleChartData(data, 60_000)).toEqual([
            [1000, 1060, 1061, 2000],
            [10, 20, null, 30],
        ])
    })

    it("keeps dense points connected", () => {
        const data = [
            { date: 1000, value: 1 },
            { date: 1060, value: 2 },
            { date: 1120, value: 3 },
        ]
        expect(prepareSingleChartData(data, 60_000)).toEqual([
            [1000, 1060, 1120],
            [1, 2, 3],
        ])
    })
})

describe("prepareMultiChartData", () => {
    it("returns empty aligned data without servers", () => {
        expect(prepareMultiChartData([], {}, 60_000)).toEqual([[], []])
    })

    it("unions timestamps and maps each server to its own column", () => {
        const servers = [server(1), server(2)]
        const recordsMap = {
            1: [
                { date: 100, value: 1 },
                { date: 200, value: 2 },
            ],
            2: [
                { date: 100, value: 5 },
                { date: 300, value: 6 },
            ],
        }
        // server 2 jumps 100 -> 300 (> 2x60s): a null gap marker is injected at 101
        expect(prepareMultiChartData(servers, recordsMap, 60_000)).toEqual([
            [100, 101, 200, 300],
            [1, null, 2, null],
            [5, null, null, 6],
        ])
    })

    it("fills an all-null column for a server without records", () => {
        const servers = [server(1), server(2)]
        const recordsMap = { 1: [{ date: 100, value: 1 }] }
        expect(prepareMultiChartData(servers, recordsMap, 60_000)).toEqual([
            [100],
            [1],
            [null],
        ])
    })
})

describe("formatAxisTick", () => {
    it("returns an empty string for null", () => {
        expect(formatAxisTick(null, "fr", "fr-FR")).toBe("")
    })

    it("formats local midnight as a date", () => {
        const midnight = new Date()
        midnight.setHours(0, 0, 0, 0)
        const ts = Math.floor(midnight.getTime() / 1000)
        const day = String(midnight.getDate()).padStart(2, "0")
        const month = String(midnight.getMonth() + 1).padStart(2, "0")
        expect(formatAxisTick(ts, "fr", "fr-FR")).toBe(`${day}/${month}`)
        expect(formatAxisTick(ts, "en", "en-US")).toBe(`${month}/${day}`)
    })

    it("formats other times as hours and minutes", () => {
        const dt = new Date()
        dt.setHours(12, 34, 0, 0)
        const ts = Math.floor(dt.getTime() / 1000)
        expect(formatAxisTick(ts, "fr", "fr-FR")).toContain(":")
    })
})

describe("time ranges and intervals", () => {
    it("exposes the documented range options", () => {
        expect(getTimeRanges(key).map(r => r.value)).toEqual([
            RANGE_1H_MS,
            RANGE_6H_MS,
            RANGE_24H_MS,
            RANGE_7D_MS,
            RANGE_30D_MS,
            RANGE_60D_MS,
        ])
    })

    it("exposes the documented interval options", () => {
        expect(getIntervals(key).map(r => r.value)).toEqual([
            INTERVAL_10S_MS,
            INTERVAL_1M_MS,
            INTERVAL_5M_MS,
            INTERVAL_30M_MS,
            INTERVAL_1H_MS,
        ])
    })
})
