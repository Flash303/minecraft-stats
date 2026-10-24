/**
 * Language resolution shared by the SSR loader (root.tsx) and the ISR cache
 * (server.ts): cookie first, then the Accept-Language header.
 */

export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl"

/** Reads the language cookie from the full Cookie header. */
export function parseLanguageCookie(cookieHeader: string | null): Language | null {
    const match = cookieHeader?.match(/(?:^|; )language=(fr|en|es|it|de|pt|ru|pl|zh-CN|ja|ko|nl)(?:;|$)/)
    return (match?.[1] as Language) ?? null
}

/**
 * First supported tag in the browser's preference order, defaulting to "fr".
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
