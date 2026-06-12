export interface Server {
    id: number
    name: string
    ip: string
    port: number
    last_favicon: string | null
    last_status: "online" | "offline" | null
    last_connected: number | null
    last_version: string | null
    user_id: string
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

export async function fetchServers(token?: string): Promise<Server[]> {
    try {
        const res = await fetch(`${API_BASE}/servers`, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
        console.error("Failed to fetch servers:", error)
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
        return json.success ? json.data : null
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
        if (interval !== undefined) params.set("interval", String(interval))
        const query = params.toString()
        const url = `${API_BASE}/records/${serverId}${query ? "?" + query : ""}`
        const res = await fetch(url, {
            headers: getHeaders(token)
        })
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
        console.error(`Failed to fetch records for server ${serverId}:`, error)
        return []
    }
}

export async function createServer(
    server: { name: string; ip: string; port: number },
    token: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await fetch(`${API_BASE}/servers`, {
            method: "POST",
            headers: getHeaders(token),
            body: JSON.stringify(server)
        })
        const json = await res.json()
        return { success: json.success, message: json.message }
    } catch (error) {
        console.error("Failed to create server:", error)
        return { success: false, message: "Erreur réseau lors de l'ajout du serveur" }
    }
}
