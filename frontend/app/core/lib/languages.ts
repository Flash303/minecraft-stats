import type { Language } from "@/core/lib/i18n"

export interface LanguageOption {
    value: Language
    /** Endonym: a language is always listed in its own language. */
    label: string
    /** BCP-47/ISO code shown as a compact badge in the mobile menu. */
    short: string
}

/**
 * Languages supported by the UI, in the order they are displayed.
 * Single source of truth for the header switcher and the mobile menu.
 */
export const LANGUAGES: readonly LanguageOption[] = [
    { value: "fr", label: "Français", short: "FR" },
    { value: "en", label: "English", short: "EN" },
    { value: "es", label: "Español", short: "ES" },
    { value: "it", label: "Italiano", short: "IT" },
    { value: "de", label: "Deutsch", short: "DE" },
    { value: "pt", label: "Português", short: "PT" },
    { value: "ru", label: "Русский", short: "RU" },
    { value: "pl", label: "Polski", short: "PL" },
    { value: "zh-CN", label: "简体中文", short: "中文" },
    { value: "ja", label: "日本語", short: "JA" },
    { value: "ko", label: "한국어", short: "KO" },
    { value: "nl", label: "Nederlands", short: "NL" },
] as const

export function getLanguageOption(language: Language): LanguageOption {
    return LANGUAGES.find((option) => option.value === language) ?? LANGUAGES[0]
}
