import { z } from "zod";
import { PUBLIC_API_URL } from "@/core/lib/config";
import { API_BASE, getHeaders } from "./client";
import { ServerSchema, type Server, type ServerRecord } from "./schemas";
import { decodeStatsBase64, parseRecordBinary } from "./records-binary";

export function getServerIconUrl(serverId: number | string): string {
    return `${PUBLIC_API_URL}/servers/${serverId}/icon?v=2`
}

export function normalizeServerData(server: unknown): Server {
    if (server && typeof server === 'object') {
        const s = server as { data?: unknown; stats_data?: unknown };
        // New backend shape: binary stats base64-encoded in `stats_data`.
        // Decoded once here so the rest of the app keeps using `data`.
        if (typeof s.stats_data === 'string' && s.stats_data.length > 0) {
            const records = decodeStatsBase64(s.stats_data);
            const { stats_data: _omitted, ...rest } = s as Record<string, unknown>;
            void _omitted;
            return {
                ...(rest as object),
                data: records
            } as Server;
        }
        // Legacy shape: `data` as a [dates, values] tuple.
        if (Array.isArray(s.data) && s.data.length >= 2) {
            const dataArr = s.data as [number[], number[]];
            const dates = dataArr[0] || []
            const values = dataArr[1] || []
            const records: ServerRecord[] = []
            for (let i = 0; i < dates.length; i++) {
                records.push({
                    date: dates[i],
                    value: values[i]
                })
            }
            return {
                ...(server as object),
                data: records
            } as Server;
        }
    }
    return server as Server;
}
export async function fetchServers(token?: string, includeStats?: boolean, forwardedFor?: string | null): Promise<Server[]> {
    const url = includeStats ? `${API_BASE}/servers?include_stats=true` : `${API_BASE}/servers`
    const res = await fetch(url, {
        headers: getHeaders(token, forwardedFor)
    })
    if (res.status === 429) throw new Error('RATE_LIMIT')
    if (!res.ok) throw new Error(`Failed to fetch servers: ${res.status}`)
    const json = await res.json()
    if (!json.success || !json.data) return []

    const normalized = (json.data as unknown[]).map(normalizeServerData);
    const parsed = z.array(ServerSchema).safeParse(normalized);
    if (!parsed.success) {
        console.error("Failed to parse servers:", parsed.error);
        return [];
    }
    return parsed.data;
}
export async function fetchMyServers(token: string, includeStats?: boolean): Promise<Server[]> {
    try {
        const url = includeStats ? `${API_BASE}/servers/mine?include_stats=true` : `${API_BASE}/servers/mine`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
        if (res.status === 429) throw new Error('RATE_LIMIT')
        if (!res.ok) return []
        const json = await res.json()
        if (!json.success || !json.data) return []
        
        const normalized = (json.data as unknown[]).map(normalizeServerData);
        const parsed = z.array(ServerSchema).safeParse(normalized);
        if (!parsed.success) {
            console.error("Failed to parse my servers:", parsed.error);
            return [];
        }
        return parsed.data;
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to fetch my servers:", error)
        return []
    }
}
export async function fetchServer(id: number | string, token?: string, forwardedFor?: string | null): Promise<Server | null> {
    try {
        const res = await fetch(`${API_BASE}/servers/${id}`, {
            headers: getHeaders(token, forwardedFor)
        })
        
        if (!res.ok) {
            return null;
        }
        
        const json = await res.json()
        
        if (!json.success || !json.data) {
            return null;
        }
        
        const normalized = normalizeServerData(json.data);
        const parsed = ServerSchema.safeParse(normalized);
        if (!parsed.success) {
            console.error(`Failed to parse server ${id}:`, parsed.error);
            return null;
        }
        return parsed.data;
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`[SSR Debug] Failed to fetch server ${id} from API_BASE ${API_BASE}:`, error)
        return null
    }
}
export async function fetchRecords(
    serverId: number,
    from?: number,
    interval?: number,
    token?: string
): Promise<ServerRecord[]> {
    try {
        const params = new URLSearchParams()
        if (from !== undefined) params.set("from", String(from))
        const query = params.toString()
        const url = `${API_BASE}/records/${serverId}${query ? "?" + query : ""}`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
        if (res.status === 429) throw new Error('RATE_LIMIT')
        if (!res.ok) return []
        
        const buffer = await res.arrayBuffer()
        const records = parseRecordBinary(buffer)

        if (interval && interval > 0) {
            const intervalSec = interval / 1000
            const buckets: Record<number, { sum: number; count: number }> = {}

            for (const record of records) {
                const bucketTime = Math.floor(record.date / intervalSec) * intervalSec
                if (!buckets[bucketTime]) {
                    buckets[bucketTime] = { sum: 0, count: 0 }
                }
                buckets[bucketTime].sum += record.value
                buckets[bucketTime].count += 1
            }

            return Object.keys(buckets).map(k => {
                const bucketTime = Number(k)
                const b = buckets[bucketTime]
                return {
                    date: bucketTime,
                    value: Math.round(b.sum / b.count)
                }
            }).sort((a, b) => a.date - b.date)
        } else {
            return records
        }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to fetch records for server ${serverId}:`, error)
        return []
    }
}
export async function createServer(
    server: { name: string; ip: string; port: number; type: "java" | "bedrock" },
    token: string
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/servers`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify(server)
        })
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to create server:", error)
        return { success: false }
    }
}
export async function renameServer(
    serverId: number,
    name: string,
    token: string
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/servers/${serverId}`, {
            method: "PATCH",
            headers: getHeaders(token),
            body: JSON.stringify({ name })
        })
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to rename server ${serverId}:`, error)
        return { success: false }
    }
}
