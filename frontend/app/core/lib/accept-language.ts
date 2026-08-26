/**
 * Résolution de la langue partagée par le loader SSR (root.tsx) et le cache
 * ISR (server.ts) : cookie d'abord, sinon header Accept-Language.
 */

export type Language = "fr" | "en"

/** Lit le cookie `language=fr|en` depuis l'en-tête Cookie complet. */
export function parseLanguageCookie(cookieHeader: string | null): Language | null {
    const match = cookieHeader?.match(/(?:^|; )language=(fr|en)(?:;|$)/)
    return (match?.[1] as Language) ?? null
}

/**
 * Premier tag fr/en trouvé par ordre de préférence du navigateur,
 * défaut "fr".
 */
export function resolveLanguageFromHeader(acceptLanguage: string | null): Language {
    if (!acceptLanguage) return "fr"
    const tags = acceptLanguage.split(",").map(part => part.split(";")[0].trim().toLowerCase())
    for (const tag of tags) {
        if (tag === "fr" || tag.startsWith("fr-")) return "fr"
        if (tag === "en" || tag.startsWith("en-")) return "en"
    }
    return "fr"
}
