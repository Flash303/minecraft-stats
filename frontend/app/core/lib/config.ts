/**
 * URL publique de l'application, sans slash final.
 * Configurée via VITE_APP_URL (voir .env.example).
 */
export const APP_URL: string = (
    import.meta.env.VITE_APP_URL || "https://mc-stats.fr"
).replace(/\/+$/, "")

/**
 * URL publique de l'API REST, sans slash final.
 * Configurée via VITE_API_URL (voir .env.example).
 */
export const PUBLIC_API_URL: string = (
    import.meta.env.VITE_API_URL || `${APP_URL}/api`
).replace(/\/+$/, "")
