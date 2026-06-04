export interface Server {
    id: number
    name: string
    ip: string
    port: number
    last_favicon: string | null
    last_status: "online" | "offline" | null
    last_connected: number | null
}

export interface Record {
    date: number
    value: number
}

const API_BASE = "http://localhost:3000"

export async function fetchServers(): Promise<Server[]> {
    try {
        const res = await fetch(`${API_BASE}/servers`)
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
        console.error("Failed to fetch servers:", error)
        return []
    }
}

export async function fetchServer(id: number): Promise<Server | null> {
    try {
        const res = await fetch(`${API_BASE}/servers/${id}`)
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
    interval?: number
): Promise<Record[]> {
    try {
        const params = new URLSearchParams()
        if (from !== undefined) params.set("from", String(from))
        if (interval !== undefined) params.set("interval", String(interval))
        const query = params.toString()
        const url = `${API_BASE}/records/${serverId}${query ? "?" + query : ""}`
        const res = await fetch(url)
        if (!res.ok) return []
        const json = await res.json()
        return json.success ? json.data : []
    } catch (error) {
        console.error(`Failed to fetch records for server ${serverId}:`, error)
        return []
    }
}
