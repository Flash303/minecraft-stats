/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translate } from "@/core/lib/i18n"
import type fr from "../../locales/fr.json"

export type Language = "fr" | "en" | "es" | "it" | "de" | "pt" | "ru" | "pl" | "zh-CN" | "ja" | "ko" | "nl"

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`
}[keyof ObjectType & (string | number)]

export type TranslationKey = NestedKeyOf<typeof fr>

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey, replacements?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children, serverLanguage }: { children: ReactNode, serverLanguage?: Language | null }) {
    // Le loader SSR résout déjà la langue (cookie ou Accept-Language) :
    // le HTML arrive dans la bonne langue, aucune bascule post-hydratation.
    const [language, setLanguage] = useState<Language>(serverLanguage ?? "fr")

    useEffect(() => {
        document.cookie = `language=${language}; path=/; max-age=31536000; SameSite=Lax`
        // Synchronise l'attribut lang pour l'accessibilité et le SEO
        document.documentElement.lang = language
    }, [language])

    const t = (path: TranslationKey, replacements?: Record<string, string>) =>
        translate(language, path, replacements)

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}
