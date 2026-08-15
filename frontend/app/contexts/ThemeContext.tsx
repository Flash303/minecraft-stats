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
    const [theme, setTheme] = useState<Theme>(() => {
        if (serverTheme) return serverTheme
        return "dark" // Default to dark to match server initial render
    })
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        if (!serverTheme && !mounted) {
            const stored = localStorage.getItem("theme")
            if (stored === "light" || stored === "dark") {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setTheme(stored)
            } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
                setTheme("dark")
            } else {
                setTheme("light")
            }
        }
        setMounted(true)
    }, [serverTheme, mounted])

    useEffect(() => {
        if (!mounted) return
        localStorage.setItem("theme", theme)
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`
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
