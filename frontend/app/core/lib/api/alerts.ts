import { z } from "zod";
import { API_BASE, getHeaders } from "./client";
import { AlertSchema, type Alert } from "./schemas";
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
