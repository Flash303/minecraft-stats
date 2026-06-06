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

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem("theme")
        if (stored === "light" || stored === "dark") return stored
        return window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
    })

    useEffect(() => {
        localStorage.setItem("theme", theme)
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
