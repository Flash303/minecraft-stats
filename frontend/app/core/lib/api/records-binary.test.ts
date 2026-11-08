import { describe, it, expect } from "vitest"
import {
    base64ToArrayBuffer,
    decodeStatsBase64,
    parseRecordBinary,
} from "./records-binary"
import { normalizeServerData } from "./servers"

/**
 * Test encoder mirroring the backend (`RecordData::into_binary`):
 * u32 LE count, i64 LE base, N x u32 LE deltas, N x i32 LE values.
 */
function encodeRecordBinary(dates: number[], values: number[]): ArrayBuffer {
    const len = dates.length
    const buffer = new ArrayBuffer(12 + len * 4 + len * 4)
    const view = new DataView(buffer)
    view.setUint32(0, len, true)
    if (len === 0) {
        view.setBigInt64(4, 0n, true)
        return buffer
    }
    const base = BigInt(dates[0])
    view.setBigInt64(4, base, true)
    for (let i = 0; i < len; i++) {
        view.setUint32(12 + i * 4, dates[i] - dates[0], true)
    }
    for (let i = 0; i < len; i++) {
        view.setInt32(12 + len * 4 + i * 4, values[i], true)
    }
    return buffer
}

function toBase64(buffer: ArrayBuffer): string {
    return Buffer.from(buffer).toString("base64")
}

describe("parseRecordBinary", () => {
    it("returns [] for an empty or truncated buffer", () => {
        expect(parseRecordBinary(new ArrayBuffer(0))).toEqual([])
        expect(parseRecordBinary(new ArrayBuffer(3))).toEqual([])
        // Declares 2 points but carries none.
        const view = new DataView(new ArrayBuffer(12))
        view.setUint32(0, 2, true)
        view.setBigInt64(4, 1_700_000_000n, true)
        expect(parseRecordBinary(view.buffer)).toEqual([])
    })

    it("returns [] when count is zero", () => {
        expect(parseRecordBinary(encodeRecordBinary([], []))).toEqual([])
    })

    it("round-trips timestamps and values", () => {
        const dates = [1_700_000_000, 1_700_000_300, 1_700_000_600]
        const values = [12, 0, 42]
        expect(parseRecordBinary(encodeRecordBinary(dates, values))).toEqual([
            { date: 1_700_000_000, value: 12 },
            { date: 1_700_000_300, value: 0 },
            { date: 1_700_000_600, value: 42 },
        ])
    })

    it("supports signed values (i32 layout)", () => {
        const dates = [1_700_000_000, 1_700_000_060]
        expect(parseRecordBinary(encodeRecordBinary(dates, [-1, 7]))).toEqual([
            { date: 1_700_000_000, value: -1 },
            { date: 1_700_000_060, value: 7 },
        ])
    })
})

describe("decodeStatsBase64", () => {
    it("returns [] for missing, empty or invalid input", () => {
        expect(decodeStatsBase64(null)).toEqual([])
        expect(decodeStatsBase64(undefined)).toEqual([])
        expect(decodeStatsBase64("")).toEqual([])
        expect(decodeStatsBase64("!!!not-base64!!!")).toEqual([])
    })

    it("decodes the backend base64 payload", () => {
        const dates = [1_700_000_000, 1_700_000_300]
        const values = [5, 9]
        const base64 = toBase64(encodeRecordBinary(dates, values))
        expect(decodeStatsBase64(base64)).toEqual([
            { date: 1_700_000_000, value: 5 },
            { date: 1_700_000_300, value: 9 },
        ])
    })

    it("base64ToArrayBuffer preserves bytes", () => {
        const bytes = new Uint8Array([0, 1, 2, 250, 255])
        const base64 = Buffer.from(bytes).toString("base64")
        expect(new Uint8Array(base64ToArrayBuffer(base64))).toEqual(bytes)
    })
})

describe("normalizeServerData", () => {
    const baseServer = {
        id: 1,
        name: "test",
        ip: "example.com",
        port: 25565,
        user_id: "user_1",
    }

    it("converts stats_data base64 into data records and strips the payload", () => {
        const base64 = toBase64(encodeRecordBinary([1_700_000_000, 1_700_000_300], [5, 9]))
        const normalized = normalizeServerData({ ...baseServer, stats_data: base64 })
        expect(normalized.data).toEqual([
            { date: 1_700_000_000, value: 5 },
            { date: 1_700_000_300, value: 9 },
        ])
        expect("stats_data" in normalized).toBe(false)
    })

    it("keeps the legacy [dates, values] tuple working", () => {
        const normalized = normalizeServerData({
            ...baseServer,
            data: [[100, 200], [1, 2]],
        })
        expect(normalized.data).toEqual([
            { date: 100, value: 1 },
            { date: 200, value: 2 },
        ])
    })

    it("leaves already-normalized records untouched", () => {
        const records = [{ date: 100, value: 1 }]
        const normalized = normalizeServerData({ ...baseServer, data: records })
        expect(normalized.data).toEqual(records)
    })
})
