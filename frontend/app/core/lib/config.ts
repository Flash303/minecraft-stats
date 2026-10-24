/**
 * Public application URL, without a trailing slash.
 * Configured via VITE_APP_URL (see .env.example).
 */
export const APP_URL: string = (
    import.meta.env.VITE_APP_URL || "https://mc-stats.fr"
).replace(/\/+$/, "")

/**
 * Public REST API URL, without a trailing slash.
 * Configured via VITE_API_URL (see .env.example).
 */
export const PUBLIC_API_URL: string = (
    import.meta.env.VITE_API_URL || `${APP_URL}/api`
).replace(/\/+$/, "")
