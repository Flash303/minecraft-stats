import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import fr from "../locales/fr.json"
import en from "../locales/en.json"

type Language = "fr" | "en"
type Translations = typeof fr

interface LanguageContextType {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, replacements?: Record<string, string>) => string
}

const translations: Record<Language, Translations> = { fr, en }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        const stored = localStorage.getItem("language")
        if (stored === "fr" || stored === "en") return stored as Language
        
        const browserLang = navigator.language.split("-")[0]
        return (browserLang === "fr" || browserLang === "en") ? (browserLang as Language) : "fr"
    })

    useEffect(() => {
        localStorage.setItem("language", language)
    }, [language])

    const t = (path: string, replacements?: Record<string, string>) => {
        const keys = path.split(".")
        let current: any = translations[language]

        for (const key of keys) {
            if (current[key] === undefined) return path
            current = current[key]
        }

        if (typeof current !== "string") return path

        let result = current
        if (replacements) {
            Object.entries(replacements).forEach(([key, value]) => {
                result = result.replace(`{{${key}}}`, value)
            })
        }
        return result
    }

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
