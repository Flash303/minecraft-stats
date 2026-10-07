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
    // Le loader SSR résout déjà la langue (cookie ou Accept-Language) :
    // le HTML arrive dans la bonne langue, aucune bascule post-hydratation.
    const [language, setLanguageState] = useState<Language>(serverLanguage ?? "fr")
    // Référence de la langue cible : si l'utilisateur bascule vite entre deux
    // langues non encore chargées, seule la dernière requête est appliquée.
    const pendingRef = useRef<Language | null>(null)

    const setLanguage = useCallback((lang: Language) => {
        pendingRef.current = lang
        // Le dictionnaire cible est chargé dynamiquement avant bascule, pour ne
        // jamais afficher de clés i18n lors d'un changement de langue.
        void loadLanguage(lang).then(() => {
            if (pendingRef.current === lang) {
                setLanguageState(lang)
            }
        })
    }, [])

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