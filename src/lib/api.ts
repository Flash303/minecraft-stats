export interface Server {
    id: number
    name: string
    ip: string
    port: number
    last_favicon: string | null
}

export interface Record {
    date: number
    value: number
}

const API_BASE = "http://localhost:3000"

export async function fetchServers(): Promise<Server[]> {
    const res = await fetch(`${API_BASE}/servers`)
    const json = await res.json()
    return json.success ? json.data : []
}

export async function fetchRecords(
    serverId: number,
    from?: number,
    interval?: number
): Promise<Record[]> {
    const params = new URLSearchParams()
    if (from !== undefined) params.set("from", String(from))
    if (interval !== undefined) params.set("interval", String(interval))
    const query = params.toString()
    const url = `${API_BASE}/records/${serverId}${query ? "?" + query : ""}`
    const res = await fetch(url)
    const json = await res.json()
    return json.success ? json.data : []
}
