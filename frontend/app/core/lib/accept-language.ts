/**
 * Language resolution shared by the SSR loader (root.tsx) and the ISR cache
 * (server.ts): cookie first, then the Accept-Language header.
 */

export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh" | "ja" | "ko" | "nl" | "he" | "cs" | "fi" | "vi" | "sr" | "ro" | "ka" | "da"

/** Reads the language cookie from the full Cookie header. */
export function parseLanguageCookie(cookieHeader: string | null): Language | null {
    const match = cookieHeader?.match(/(?:^|; )language=(fr|en|es|it|de|pt|ru|pl|zh|ja|ko|nl|he|cs|fi|vi|sr|ro|ka|da)(?:;|$)/)
    if (match?.[1]) return match[1] as Language
    // Legacy cookie written before zh-CN was renamed to zh.
    if (/(?:^|; )language=zh-CN(?:;|$)/.test(cookieHeader ?? "")) return "zh"
    return null
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
        if (tag === "zh" || tag.startsWith("zh-")) return "zh"
        if (tag === "ja" || tag.startsWith("ja-")) return "ja"
        if (tag === "ko" || tag.startsWith("ko-")) return "ko"
        if (tag === "nl" || tag.startsWith("nl-")) return "nl"
        if (tag === "he" || tag.startsWith("he-")) return "he"
        if (tag === "cs" || tag.startsWith("cs-")) return "cs"
        if (tag === "fi" || tag.startsWith("fi-")) return "fi"
        if (tag === "vi" || tag.startsWith("vi-")) return "vi"
        if (tag === "sr" || tag.startsWith("sr-")) return "sr"
        if (tag === "ro" || tag.startsWith("ro-")) return "ro"
        if (tag === "ka" || tag.startsWith("ka-")) return "ka"
        if (tag === "da" || tag.startsWith("da-")) return "da"
    }
    return "fr"
}
