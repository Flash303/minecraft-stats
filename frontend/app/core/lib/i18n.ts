import fr from "@/locales/fr.json"
import en from "@/locales/en.json"

const translations: Record<string, unknown> = { fr, en }

/**
 * Recherche pure dans les dictionnaires de traduction, utilisable hors React
 * (meta SSR, service worker...) comme dans les composants via LanguageContext.
 * Retourne la clé si introuvable, comme le fait le hook t().
 */
export function translate(
    language: "fr" | "en",
    path: string,
    replacements?: Record<string, string>
): string {
    let current: unknown = translations[language]

    for (const key of path.split(".")) {
        if (typeof current !== "object" || current === null || !(key in current)) {
            return path
        }
        current = (current as Record<string, unknown>)[key]
    }

    if (typeof current !== "string") return path

    if (!replacements) return current
    return Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
        current
    )
}
