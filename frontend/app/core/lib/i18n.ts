import fr from "@/locales/fr.json"
import en from "@/locales/en.json"
import es from "@/locales/es.json"
import it from "@/locales/it.json"
import de from "@/locales/de.json"
import pt from "@/locales/pt.json"
import ru from "@/locales/ru.json"
import pl from "@/locales/pl.json"
import zhCN from "@/locales/zh-CN.json"
import ja from "@/locales/ja.json"
import ko from "@/locales/ko.json"
import nl from "@/locales/nl.json"

const translations: Record<string, unknown> = { fr, en, es, it, de, pt, ru, pl, "zh-CN": zhCN, ja, ko, nl }

/**
 * Recherche pure dans les dictionnaires de traduction, utilisable hors React
 * (meta SSR, service worker...) comme dans les composants via LanguageContext.
 * Retourne la clé si introuvable, comme le fait le hook t().
 */
export function translate(
    language: "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl",
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
