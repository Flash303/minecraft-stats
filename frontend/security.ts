/**
 * Security headers applied to every response (SSR HTML, ISR cache and static files).
 *
 * CSP note: `script-src` includes 'unsafe-inline' because React Router injects
 * inline hydration scripts (no per-request nonce system). The policy still
 * blocks third-party scripts/iframes/objects and external framing.
 */
export const SECURITY_HEADERS: Record<string, string> = {
    "Content-Security-Policy": [
        "default-src 'self'",
        // Clerk loads clerk-js from its FAPI (*.clerk.accounts.dev in test,
        // *.clerk.com / clerk.mc-stats.fr in production)
        "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://clerk.mc-stats.fr https://cloud.umami.is",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https:",
        "media-src 'self' https:",
        "connect-src 'self' https: wss:",
        "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://*.clerk.accounts.dev https://*.clerk.com",
        "worker-src 'self' blob: https://*.clerk.accounts.dev https://*.clerk.com",
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
