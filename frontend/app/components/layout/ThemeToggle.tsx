import { useTheme } from "@/contexts/ThemeContext"
import { Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <Button variant="outline" size="icon" onClick={toggleTheme}>
            {theme === "light" ? (
                <Moon className="h-4 w-4" />
            ) : (
                <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
