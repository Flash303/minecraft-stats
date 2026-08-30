import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode
} from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children, serverTheme }: { children: ReactNode, serverTheme?: Theme | null }) {
    // Le cookie SSR est la source de vérité ; sans cookie (première visite),
    // on résout la préférence système de manière synchrone pour rester
    // cohérent avec le script anti-flash du <head> (root.tsx).
    const [theme, setTheme] = useState<Theme>(() => {
        if (serverTheme) return serverTheme
        if (typeof window !== "undefined" && !window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "light"
        }
        return "dark"
    })

    // Applique la classe et persiste le cookie (y compris au montage : la
    // préférence système devient ainsi le thème servi par le SSR à la
    // prochaine visite). Idempotent, aucun flash possible.
    useEffect(() => {
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`
        document.documentElement.classList.toggle("dark", theme === "dark")
    }, [theme])

    const toggleTheme = () =>
        setTheme((prev) => (prev === "light" ? "dark" : "light"))

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
    return ctx
}
