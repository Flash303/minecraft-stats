/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import fr from "../../locales/fr.json"
import en from "../../locales/en.json"

type Language = "fr" | "en"
type Translations = typeof fr

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

const translations: Record<Language, Translations> = { fr, en }

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children, serverLanguage }: { children: ReactNode, serverLanguage?: Language | null }) {
    const [language, setLanguage] = useState<Language>(() => {
        if (serverLanguage) return serverLanguage
        if (typeof window === "undefined") return "fr"
        return "fr" // Default to fr to match server initial render and prevent hydration mismatch
    })

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (!serverLanguage && !mounted) {
            // First visit without cookie, try to recover from localStorage or browser
            const stored = localStorage.getItem("language")
            if (stored === "fr" || stored === "en") {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setLanguage(stored)
            } else {
                const browserLang = navigator.language.split("-")[0]
                if (browserLang === "fr" || browserLang === "en") {
                    setLanguage(browserLang)
                }
            }
        }
        setMounted(true)
    }, [serverLanguage, mounted])

    useEffect(() => {
        if (!mounted) return
        localStorage.setItem("language", language)
        document.cookie = `language=${language}; path=/; max-age=31536000; SameSite=Lax`
        // Synchronise l'attribut lang pour l'accessibilité et le SEO
        document.documentElement.lang = language
    }, [language, mounted])

    const t = (path: TranslationKey, replacements?: Record<string, string>) => {
        const keys = (path as string).split(".")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
