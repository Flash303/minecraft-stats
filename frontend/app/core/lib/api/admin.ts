import { z } from "zod";
import { API_BASE, getHeaders } from "./client";
import { UserSchema, type User } from "./schemas";
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
