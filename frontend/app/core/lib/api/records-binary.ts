import type { ServerRecord } from "./schemas";

/**
 * Binary layout produced by the backend (`RecordData::into_binary`,
 * `backend/crates/repository/src/models/record.rs`) and served both by
 * `GET /records/{id}` (`application/octet-stream`) and — base64 encoded —
 * by the server list (`stats_data` field of `BigServerResponse`).
 *
 * ```
 * u32 LE ............ number of points N
 * i64 LE ............ base unix timestamp (0 when N == 0)
 * N x u32 LE ........ per-point deltas (timestamp - base)
 * N x i32 LE ........ per-point values
 * ```
 *
 * All multi-byte integers are little-endian.
 */

const COUNT_SIZE = 4;
const BASE_TIMESTAMP_SIZE = 8;
const HEADER_SIZE = COUNT_SIZE + BASE_TIMESTAMP_SIZE;
const DELTA_SIZE = 4;
const VALUE_SIZE = 4;

/** Decode a base64 string into an `ArrayBuffer` (Node + browser safe). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const nodeBuffer = (globalThis as { Buffer?: { from(s: string, e: string): Uint8Array } }).Buffer;
    if (nodeBuffer) {
        const bytes = nodeBuffer.from(base64, "base64");
        // Slice to detach from a potentially pooled underlying ArrayBuffer.
        return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Parse the raw stats binary format into `{ date, value }` records.
 * Tolerant by design: any truncated or malformed payload yields `[]`
 * instead of throwing, so a single corrupt server can't break the list.
 */
export function parseRecordBinary(buffer: ArrayBuffer): ServerRecord[] {
    if (buffer.byteLength < COUNT_SIZE) return [];

    const view = new DataView(buffer);
    const count = view.getUint32(0, true);
    if (count === 0) return [];

    const expectedSize = HEADER_SIZE + count * DELTA_SIZE + count * VALUE_SIZE;
    if (buffer.byteLength < expectedSize) return [];

    const baseTimestamp = Number(view.getBigInt64(COUNT_SIZE, true));
    const deltasOffset = HEADER_SIZE;
    const valuesOffset = HEADER_SIZE + count * DELTA_SIZE;

    const records: ServerRecord[] = new Array(count);
    for (let i = 0; i < count; i++) {
        const delta = view.getUint32(deltasOffset + i * DELTA_SIZE, true);
        const value = view.getInt32(valuesOffset + i * VALUE_SIZE, true);
        records[i] = { date: baseTimestamp + delta, value };
    }
    return records;
}

/**
 * Decode a base64 `stats_data` payload (server list) into records.
 * Returns `[]` for missing, empty or invalid input — never throws.
 */
export function decodeStatsBase64(base64: string | null | undefined): ServerRecord[] {
    if (!base64 || typeof base64 !== "string" || base64.length === 0) return [];
    try {
        return parseRecordBinary(base64ToArrayBuffer(base64));
    } catch {
        return [];
    }
}
