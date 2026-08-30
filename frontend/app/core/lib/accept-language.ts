/**
 * Résolution de la langue partagée par le loader SSR (root.tsx) et le cache
 * ISR (server.ts) : cookie d'abord, sinon header Accept-Language.
 */

export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl"

/** Lit le cookie depuis l'en-tête Cookie complet. */
export function parseLanguageCookie(cookieHeader: string | null): Language | null {
    const match = cookieHeader?.match(/(?:^|; )language=(fr|en|es|it|de|pt|ru|pl|zh-CN|ja|ko|nl)(?:;|$)/)
    return (match?.[1] as Language) ?? null
}

/**
 * Premier tag trouvé par ordre de préférence du navigateur,
 * défaut "fr".
 */
export function resolveLanguageFromHeader(acceptLanguage: string | null): Language {
    if (!acceptLanguage) return "fr"
    const tags = acceptLanguage.split(",").map(part => part.split(";")[0].trim().toLowerCase())
    for (const tag of tags) {
        if (tag === "fr" || tag.startsWith("fr-")) return "fr"
        if (tag === "en" || tag.startsWith("en-")) return "en"
        if (tag === "es" || tag.startsWith("es-")) return "es"
        if (tag === "it" || tag.startsWith("it-")) return "it"
        if (tag === "de" || tag.startsWith("de-")) return "de"
        if (tag === "pt" || tag.startsWith("pt-")) return "pt"
        if (tag === "ru" || tag.startsWith("ru-")) return "ru"
        if (tag === "pl" || tag.startsWith("pl-")) return "pl"
        if (tag === "zh-cn" || tag === "zh") return "zh-CN"
        if (tag === "ja" || tag.startsWith("ja-")) return "ja"
        if (tag === "ko" || tag.startsWith("ko-")) return "ko"
        if (tag === "nl" || tag.startsWith("nl-")) return "nl"
    }
    return "fr"
}
