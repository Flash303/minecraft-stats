import { useTheme } from "@/core/contexts/ThemeContext"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/ui/components/button"

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()
    const { t } = useLanguage()

    return (
        <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === "light" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">{t("common.toggleTheme")}</span>
        </Button>
    )
}
