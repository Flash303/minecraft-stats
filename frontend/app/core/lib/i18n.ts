export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl"

/**
 * Dictionnaires de traduction enregistrés à la demande.
 *
 * - Côté SSR : `i18n.server.ts` importe statiquement les 12 locales et les
 *   enregistre AVANT le render, pour que les meta() et le HTML soient rendus
 *   dans la langue résolue par cookie/Accept-Language.
 * - Côté client : seule la langue active est chargée dynamiquement (via
 *   `loadLanguage`), et de préférence AVANT l'hydratation (entry.client)
 *   pour éviter toute divergence d'hydratation.
 */
const dictionaries: Partial<Record<Language, Record<string, unknown>>> = {}

const loaders: Record<Language, () => Promise<{ default: Record<string, unknown> }>> = {
    fr: () => import("@/locales/fr.json"),
    en: () => import("@/locales/en.json"),
    es: () => import("@/locales/es.json"),
    it: () => import("@/locales/it.json"),
    de: () => import("@/locales/de.json"),
    pt: () => import("@/locales/pt.json"),
    ru: () => import("@/locales/ru.json"),
    pl: () => import("@/locales/pl.json"),
    "zh-CN": () => import("@/locales/zh-CN.json"),
    ja: () => import("@/locales/ja.json"),
    ko: () => import("@/locales/ko.json"),
    nl: () => import("@/locales/nl.json"),
}

// Promesses mises en cache : un même dictionnaire n'est importé qu'une fois.
const loading: Partial<Record<Language, Promise<void>>> = {}

/**
 * Enregistre un dictionnaire de traduction dans le registre partagé.
 * Utilisé par i18n.server.ts (SSR) et par loadLanguage (client).
 */
export function registerTranslations(language: Language, dict: Record<string, unknown>): void {
    dictionaries[language] = dict
}

/**
 * Charge un dictionnaire de manière asynchrone (import dynamique côté client).
 * No-op si la langue est déjà enregistrée ou en cours de chargement.
 */
export function loadLanguage(language: Language): Promise<void> {
    const existing = dictionaries[language] ?? loading[language]
    if (existing) {
        return existing instanceof Promise ? existing : Promise.resolve()
    }
    const promise = loaders[language]().then((mod) => {
        registerTranslations(language, mod.default)
    })
    loading[language] = promise
    return promise
}

/**
 * Recherche pure dans les dictionnaires de traduction, utilisable hors React
 * (meta SSR, service worker...) comme dans les composants via LanguageContext.
 * Retourne la clé si introuvable (dictionnaire non chargé ou clé absente),
 * comme le faisait l'ancien comportement.
 */
export function translate(
    language: Language,
    path: string,
    replacements?: Record<string, string>
): string {
    const dict = dictionaries[language]
    if (!dict) return path

    let current: unknown = dict

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