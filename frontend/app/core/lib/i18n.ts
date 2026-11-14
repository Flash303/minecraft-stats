export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl" | "he" | "cs" | "fi" | "vi" | "sr" | "ro" | "ka" | "da"

/**
 * Translation dictionaries registered on demand.
 *
 * - SSR: `i18n.server.ts` statically imports all 12 locales and registers them
 *   BEFORE rendering so meta() and the HTML use the language resolved from
 *   the cookie/Accept-Language header.
 * - Client: only the active language is loaded dynamically (via
 *   `loadLanguage`), preferably BEFORE hydration (entry.client) to avoid any
 *   hydration mismatch.
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
    he: () => import("@/locales/he.json"),
    cs: () => import("@/locales/cs.json"),
    fi: () => import("@/locales/fi.json"),
    vi: () => import("@/locales/vi.json"),
    sr: () => import("@/locales/sr.json"),
    ro: () => import("@/locales/ro.json"),
    ka: () => import("@/locales/ka.json"),
    da: () => import("@/locales/da.json"),
}

// Cached promises: a given dictionary is imported only once.
const loading: Partial<Record<Language, Promise<void>>> = {}

/**
 * Registers a translation dictionary in the shared registry.
 * Used by i18n.server.ts (SSR) and by loadLanguage (client).
 */
export function registerTranslations(language: Language, dict: Record<string, unknown>): void {
    dictionaries[language] = dict
}

/**
 * Loads a dictionary asynchronously (dynamic import on the client).
 * No-op if the language is already registered or being loaded.
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
 * Pure dictionary lookup, usable outside React (SSR meta, service worker...)
 * as well as from components through LanguageContext.
 * Untranslated keys gracefully fall back to English instead of leaking raw
 * `section.key` paths into the UI; unknown keys return the path, matching
 * the previous behavior.
 */
export function translate(
    language: Language,
    path: string,
    replacements?: Record<string, string>
): string {
    const hit = lookup(dictionaries[language], path)
    if (hit !== undefined) return applyReplacements(hit, replacements)

    if (language !== "en") {
        const enHit = lookup(dictionaries.en, path)
        if (enHit !== undefined) return applyReplacements(enHit, replacements)
    }

    return path
}

function lookup(dict: Record<string, unknown> | undefined, path: string): string | undefined {
    if (!dict) return undefined

    let current: unknown = dict

    for (const key of path.split(".")) {
        if (typeof current !== "object" || current === null || !(key in current)) {
            return undefined
        }
        current = (current as Record<string, unknown>)[key]
    }

    return typeof current === "string" ? current : undefined
}

function applyReplacements(value: string, replacements?: Record<string, string>): string {
    if (!replacements) return value
    return Object.entries(replacements).reduce(
        (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
        value
    )
}