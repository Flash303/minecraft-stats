import {
    createContext,
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

export { ThemeContext }

export function ThemeProvider({ children, serverTheme }: { children: ReactNode, serverTheme?: Theme | null }) {
    // The SSR cookie is the source of truth; without a cookie (first visit),
    // resolve the system preference synchronously to stay consistent with the
    // anti-flash script in <head> (root.tsx).
    const [theme, setTheme] = useState<Theme>(() => {
        if (serverTheme) return serverTheme
        if (typeof window !== "undefined" && !window.matchMedia("(prefers-color-scheme: dark)").matches) {
            return "light"
        }
        return "dark"
    })

    // Apply the class and persist the cookie (including on mount: the system
    // preference thus becomes the theme served by SSR on the next visit).
    // Idempotent, so no flash is possible.
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
