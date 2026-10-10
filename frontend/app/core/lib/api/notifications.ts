import { API_BASE, getHeaders } from "./client";
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
