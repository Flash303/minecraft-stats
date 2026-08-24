/**
 * Security headers appliqués à toutes les réponses (HTML SSR, cache ISR et fichiers statiques).
 *
 * Note CSP : `script-src` inclut 'unsafe-inline' car React Router injecte des scripts
 * inline pour l'hydratation (sans système de nonce par requête). La politique bloque
 * malgré tout les scripts/iframes/objets tiers et le framing externe.
 */
export const SECURITY_HEADERS: Record<string, string> = {
    "Content-Security-Policy": [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "media-src 'self' https:",
        "connect-src 'self' https: wss:",
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
    ].join("; "),
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}

export function applySecurityHeaders(headers: Headers): Headers {
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        if (!headers.has(key)) {
            headers.set(key, value)
        }
    }
    return headers
}
