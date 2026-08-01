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
    const [theme, setTheme] = useState<Theme>("dark")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem("theme")
        if (stored === "light" || stored === "dark") {
            setTheme(stored)
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark")
        } else {
            setTheme("light")
        }
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!mounted) return
        localStorage.setItem("theme", theme)
        document.documentElement.classList.toggle("dark", theme === "dark")
    }, [theme, mounted])

    const toggleTheme = () =>
        setTheme((prev) => (prev === "light" ? "dark" : "light"))

    // To prevent hydration errors for components relying on theme (like icons),
    // they can check if the theme is mounted, but returning theme is usually fine
    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            <div style={{ display: "contents" }} suppressHydrationWarning>
                {children}
            </div>
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const ctx = useContext(ThemeContext)
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
    return ctx
}
