/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { translate, loadLanguage, type Language } from "@/core/lib/i18n"
import type fr from "../../locales/fr.json"

export type TranslationKey = NestedKeyOf<typeof fr>

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: TranslationKey, replacements?: Record<string, string>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children, serverLanguage }: { children: ReactNode, serverLanguage?: Language | null }) {
    // The SSR loader already resolved the language (cookie or Accept-Language):
    // the HTML arrives in the right language, with no post-hydration switch.
    const [language, setLanguageState] = useState<Language>(serverLanguage ?? "fr")
    // Target language reference: if the user switches quickly between two
    // languages that are not loaded yet, only the last request is applied.
    const pendingRef = useRef<Language | null>(null)

    const setLanguage = useCallback((lang: Language) => {
        pendingRef.current = lang
        // The target dictionary is loaded dynamically before switching, so i18n
        // keys are never displayed during a language change.
        void loadLanguage(lang).then(() => {
            if (pendingRef.current === lang) {
                setLanguageState(lang)
            }
        })
    }, [])

    useEffect(() => {
        document.cookie = `language=${language}; path=/; max-age=31536000; SameSite=Lax`
        // Keep the lang attribute in sync for accessibility and SEO
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