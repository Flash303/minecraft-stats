import { z } from "zod";

export const UserSchema = z.object({
    id: z.string(),
    username: z.string().nullish().catch(null),
    first_name: z.string().nullish().catch(null),
    last_name: z.string().nullish().catch(null),
    image_url: z.string().nullish().catch(null),
    has_image: z.boolean().catch(false),
});
export type User = z.infer<typeof UserSchema>;

export const ServerRecordSchema = z.object({
    date: z.number(),
    value: z.number(),
});
export type ServerRecord = z.infer<typeof ServerRecordSchema>;

export const ServerSchema = z.object({
    id: z.number(),
    name: z.string(),
    ip: z.string(),
    port: z.number(),
    last_favicon: z.string().nullish().catch(null),
    last_status: z.enum(["online", "offline"]).nullish().catch(null),
    last_connected: z.number().nullish().catch(null),
    max_players: z.number().nullish().catch(null),
    last_max_players: z.number().nullish().catch(null),
    last_version: z.string().nullish().catch(null),
    last_motd: z.any(),
    last_ping_time: z.number().nullish().catch(null),
    last_sample: z.string().nullish().catch(null),
    last_protocol_version: z.number().nullish().catch(null),
    user_id: z.string(),
    user: UserSchema.nullish().catch(null),
    type: z.enum(["java", "bedrock"]).nullish().catch(undefined),
    hidden: z.boolean().nullish().catch(undefined),
    registered_date: z.number().nullish().catch(undefined),
    data: z.array(ServerRecordSchema).nullish().catch(undefined),
});
export type Server = z.infer<typeof ServerSchema>;

export const AlertSchema = z.object({
    id: z.number(),
    user_id: z.string(),
    server_id: z.number(),
    alert_type: z.enum(["status_to_offline", "status_to_online", "player_above", "player_below"]),
    player_threshold: z.number().nullish().catch(null),
    is_active: z.boolean().catch(true),
    created_at: z.unknown(),
});
export type Alert = z.infer<typeof AlertSchema>;

export const API_BASE = (typeof window === "undefined" && process.env.SSR_API_URL) 
    ? process.env.SSR_API_URL 
    : (import.meta.env.VITE_API_URL || "http://localhost:3000")

export function getServerIconUrl(serverId: number | string): string {
    return `/api/favicon/${serverId}`
}

/**
 * Helper to build headers with optional auth token
 */
function getHeaders(token?: string, forwardedFor?: string | null): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    }
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }
    if (forwardedFor) {
        headers["X-Forwarded-For"] = forwardedFor
    }
    return headers
}

export function normalizeServerData(server: unknown): Server {
    if (server && typeof server === 'object' && 'data' in server) {
        const s = server as { data?: unknown };
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
        if (buffer.byteLength < 4) return []

        const dataView = new DataView(buffer)
        const len = dataView.getUint32(0, true)
        if (len === 0) return []

        const baseTimestamp = Number(dataView.getBigInt64(4, true))

        const deltasOffset = 12
        const valuesOffset = 12 + len * 4

        const deltas = new Uint32Array(buffer, deltasOffset, len)
        const valuesArr = new Uint32Array(buffer, valuesOffset, len)

        const dates = new Float64Array(len)
        for (let i = 0; i < len; i++) {
            dates[i] = baseTimestamp + deltas[i]
        }

        if (interval && interval > 0) {
            const intervalSec = interval / 1000
            const buckets: Record<number, { sum: number; count: number }> = {}

            for (let i = 0; i < len; i++) {
                const t = dates[i]
                const val = valuesArr[i]
                const bucketTime = Math.floor(t / intervalSec) * intervalSec
                if (!buckets[bucketTime]) {
                    buckets[bucketTime] = { sum: 0, count: 0 }
                }
                buckets[bucketTime].sum += val
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
            const records: ServerRecord[] = []
            for (let i = 0; i < len; i++) {
                records.push({
                    date: dates[i],
                    value: valuesArr[i]
                })
            }
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

export async function deleteServer(
    serverId: number,
    token: string
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/admin/servers/${serverId}`, {
            method: "DELETE",
            headers: getHeaders(token)
        })
        if (res.status === 204 || res.status === 200) return { success: true }
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to delete server ${serverId}:`, error)
        return { success: false }
    }
}

export async function updateFavicon(
    serverId: number,
    favicon: string | null,
    token: string
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/admin/servers/${serverId}/favicon`, {
            method: "PATCH",
            headers: getHeaders(token),
            body: JSON.stringify({ favicon })
        })
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to update favicon for server ${serverId}:`, error)
        return { success: false }
    }
}

export async function checkAdminStatus(token: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/admin`, {
            headers: getHeaders(token)
        })
        if (!res.ok) return false
        const json = await res.json()
        return json.success === true
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to check admin status:", error)
        return false
    }
}

export async function fetchAdminUsers(token: string): Promise<User[]> {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: getHeaders(token)
        })
        if (res.status === 429) throw new Error('RATE_LIMIT')
        if (!res.ok) return []
        const json = await res.json()
        if (json.success) {
            const parsed = z.array(UserSchema).safeParse(json.data);
            if (!parsed.success) {
                console.error("Failed to parse admin users:", parsed.error);
                return [];
            }
            return parsed.data;
        }
        return []
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to fetch admin users:", error)
        return []
    }
}

export async function toggleServerVisibility(
    serverId: number,
    token: string,
    hidden: boolean
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/admin/servers/${serverId}?hidden=${hidden}`, {
            method: "POST",
            headers: getHeaders(token)
        })
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to toggle visibility for server ${serverId}:`, error)
        return { success: false }
    }
}

export async function fetchAlerts(serverId: number, token: string): Promise<Alert[]> {
    try {
        const res = await fetch(`${API_BASE}/servers/${serverId}/alerts`, {
            headers: getHeaders(token)
        })
        if (res.status === 429) throw new Error('RATE_LIMIT')
        if (!res.ok) return []
        const json = await res.json()
        if (json.success) {
            const parsed = z.array(AlertSchema).safeParse(json.data);
            if (!parsed.success) {
                console.error("Failed to parse alerts:", parsed.error);
                return [];
            }
            return parsed.data;
        }
        return []
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to fetch alerts:", error)
        return []
    }
}

export async function fetchAllUserAlerts(token: string): Promise<Alert[]> {
    try {
        const res = await fetch(`${API_BASE}/notifications/list`, {
            headers: getHeaders(token)
        })
        if (res.status === 429) throw new Error('RATE_LIMIT')
        if (!res.ok) return []
        const json = await res.json()
        if (json.success) {
            const parsed = z.array(AlertSchema).safeParse(json.data);
            if (!parsed.success) {
                console.error("Failed to parse all user alerts:", parsed.error);
                return [];
            }
            return parsed.data;
        }
        return []
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to fetch all user alerts:", error)
        return []
    }
}

export async function createAlert(
    serverId: number,
    alert: { alert_type: string; player_threshold?: number | null; is_active?: boolean },
    token: string
): Promise<Alert | null> {
    try {
        const res = await fetch(`${API_BASE}/servers/${serverId}/alerts`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify(alert)
        })
        if (!res.ok) return null
        const json = await res.json()
        if (json.success) {
            const parsed = AlertSchema.safeParse(json.data);
            if (!parsed.success) {
                console.error("Failed to parse created alert:", parsed.error);
                return null;
            }
            return parsed.data;
        }
        return null;
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to create alert:", error)
        return null
    }
}

export async function deleteAlert(alertId: number, token: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/servers/alerts/${alertId}`, {
            method: "DELETE",
            headers: getHeaders(token)
        })
        return res.ok
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to delete alert ${alertId}:`, error)
        return false
    }
}

export async function fetchVapidKey(): Promise<string | null> {
    try {
        const res = await fetch(`${API_BASE}/notifications/vapid-key`)
        if (!res.ok) return null
        const json = await res.json()
        return json.success ? json.data.public_key : null
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to fetch VAPID key:", error)
        return null
    }
}

export async function subscribeDevice(
    subscription: { endpoint: string; p256dh: string; auth: string },
    token: string
): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/notifications/subscribe`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify(subscription)
        })
        return res.ok
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to subscribe device:", error)
        return false
    }
}

export async function unsubscribeDevice(endpoint: string, token: string): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/notifications/unsubscribe`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify({ endpoint })
        })
        return res.ok
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error("Failed to unsubscribe device:", error)
        return false
    }
}

export async function pingServerIp(
    serverId: number,
    ip: string,
    port: number,
    token: string
): Promise<{ success: boolean; data?: unknown; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/admin/servers/${serverId}/ping-ip`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify({ ip, port })
        })
        const json = await res.json()
        return { success: json.success, data: json.data, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to ping server IP ${serverId}:`, error)
        return { success: false, message: "Network error" }
    }
}

export async function updateServerIp(
    serverId: number,
    ip: string,
    port: number,
    token: string
): Promise<{ success: boolean; message?: string; message_key?: string }> {
    try {
        const res = await fetch(`${API_BASE}/admin/servers/${serverId}/ip`, {
            method: "PATCH",
            headers: getHeaders(token),
            body: JSON.stringify({ ip, port })
        })
        const json = await res.json()
        return { success: json.success, message: json.message, message_key: json.message_key }
    } catch (error: unknown) {
        if (error instanceof Error && error.message === 'RATE_LIMIT') throw error;
        console.error(`Failed to update server IP ${serverId}:`, error)
        return { success: false, message: "Network error" }
    }
}
