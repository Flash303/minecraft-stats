import { useTheme } from "@/core/hooks/useTheme"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/ui/components/button"

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()
    const { t } = useLanguage()

    return (
        // Sans cookie de thème, le SSR suppose "dark" alors que le client
        // résout `prefers-color-scheme` : l'icône peut diverger au premier
        // rendu (corrigée juste après par l'effet). Divergence attendue et
        // bénigne, on coupe l'avertissement d'hydratation (même approche que
        // `suppressHydrationWarning` sur <html> dans root.tsx).
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
