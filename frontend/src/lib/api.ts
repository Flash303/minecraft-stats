export interface User {
    id: string
    username: string | null
    first_name: string | null
    last_name: string | null
    image_url: string | null
    has_image: boolean
}

export interface Server {
    id: number
    name: string
    ip: string
    port: number
    last_favicon: string | null
    last_status: "online" | "offline" | null
    last_connected: number | null
    max_players?: number | null
    last_max_players?: number | null
    last_version: string | null
    last_motd?: { [key: string]: any } | null
    last_ping_time?: number | null
    user_id: string
    user?: User | null
    type?: "java" | "bedrock"
    hidden?: boolean
    registered_date?: number
    data?: Record[]
}


export interface Record {
    date: number
    value: number
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000"

/**
 * Helper to build headers with optional auth token
 */
function getHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    }
    if (token) {
        headers["Authorization"] = `Bearer ${token}`
    }
    return headers
}

export async function fetchServers(token?: string, includeStats?: boolean): Promise<Server[]> {
    try {
        const url = includeStats ? `${API_BASE}/servers?include_stats=true` : `${API_BASE}/servers`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        if (!json.success || !json.data) return []
        
        const servers = json.data as any[]
        return servers.map(server => {
            if (server.data && Array.isArray(server.data) && server.data.length >= 2) {
                const dates = server.data[0] || []
                const values = server.data[1] || []
                const records: Record[] = []
                for (let i = 0; i < dates.length; i++) {
                    records.push({
                        date: dates[i],
                        value: values[i]
                    })
                }
                return {
                    ...server,
                    data: records
                }
            }
            return server
        })
    } catch (error) {
        console.error("Failed to fetch servers:", error)
        return []
    }
}

export async function fetchMyServers(token: string, includeStats?: boolean): Promise<Server[]> {
    try {
        const url = includeStats ? `${API_BASE}/servers/mine?include_stats=true` : `${API_BASE}/servers/mine`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        if (!json.success || !json.data) return []
        
        const servers = json.data as any[]
        return servers.map(server => {
            if (server.data && Array.isArray(server.data) && server.data.length >= 2) {
                const dates = server.data[0] || []
                const values = server.data[1] || []
                const records: Record[] = []
                for (let i = 0; i < dates.length; i++) {
                    records.push({
                        date: dates[i],
                        value: values[i]
                    })
                }
                return {
                    ...server,
                    data: records
                }
            }
            return server
        })
    } catch (error) {
        console.error("Failed to fetch my servers:", error)
        return []
    }
}

export async function fetchServer(id: number, token?: string): Promise<Server | null> {
    try {
        const res = await fetch(`${API_BASE}/servers/${id}`, {
            headers: getHeaders(token)
        })
        if (!res.ok) return null
        const json = await res.json()
        if (!json.success || !json.data) return null
        
        const server = json.data
        if (server.data && Array.isArray(server.data) && server.data.length >= 2) {
            const dates = server.data[0] || []
            const values = server.data[1] || []
            const records: Record[] = []
            for (let i = 0; i < dates.length; i++) {
                records.push({
                    date: dates[i],
                    value: values[i]
                })
            }
            return {
                ...server,
                data: records
            }
        }
        return server
    } catch (error) {
        console.error(`Failed to fetch server ${id}:`, error)
        return null
    }
}

export async function fetchRecords(
    serverId: number,
    from?: number,
    interval?: number,
    token?: string
): Promise<Record[]> {
    try {
        const params = new URLSearchParams()
        if (from !== undefined) params.set("from", String(from))
        const query = params.toString()
        const url = `${API_BASE}/records/${serverId}${query ? "?" + query : ""}`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
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
            const buckets: { [bucketTime: number]: { sum: number; count: number } } = {}

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
            const records: Record[] = []
            for (let i = 0; i < len; i++) {
                records.push({
                    date: dates[i],
                    value: valuesArr[i]
                })
            }
            return records
        }
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        console.error(`Failed to delete server ${serverId}:`, error)
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
    } catch (error) {
        console.error("Failed to check admin status:", error)
        return false
    }
}

export async function fetchAdminUsers(token: string): Promise<User[]> {
    try {
        const res = await fetch(`${API_BASE}/admin/users`, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
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
    } catch (error) {
        console.error(`Failed to toggle visibility for server ${serverId}:`, error)
        return { success: false }
    }
}

export interface Alert {
    id: number
    user_id: string
    server_id: number
    alert_type: "status_to_offline" | "status_to_online" | "player_above" | "player_below"
    player_threshold: number | null
    is_active: boolean
    created_at: string
}

export async function fetchAlerts(serverId: number, token: string): Promise<Alert[]> {
    try {
        const res = await fetch(`${API_BASE}/servers/${serverId}/alerts`, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
        console.error("Failed to fetch alerts:", error)
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
        return json.success ? json.data : null
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
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
    } catch (error) {
        console.error("Failed to unsubscribe device:", error)
        return false
    }
}


