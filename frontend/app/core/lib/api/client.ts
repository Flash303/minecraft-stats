export const API_BASE = (typeof window === "undefined" && process.env.SSR_API_URL) 
    ? process.env.SSR_API_URL 
    : (import.meta.env.VITE_API_URL || "http://localhost:3000")
/**
 * Helper to build headers with optional auth token
 */
export function getHeaders(token?: string, forwardedFor?: string | null): HeadersInit {
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
