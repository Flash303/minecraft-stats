import { useTheme } from "@/core/hooks/useTheme"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/ui/components/button"

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()
    const { t } = useLanguage()

    return (
        // Without a theme cookie, SSR assumes "dark" while the client resolves
        // `prefers-color-scheme`: the icon may diverge on first render (fixed
        // right after by the effect). This divergence is expected and benign,
        // so the hydration warning is suppressed (same approach as
        // `suppressHydrationWarning` on <html> in root.tsx).
        <Button variant="outline" size="icon" onClick={toggleTheme} suppressHydrationWarning>
            {theme === "light" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">{t("common.toggleTheme")}</span>
        </Button>
    )
}
