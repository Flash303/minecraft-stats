import { Search, X } from "lucide-react"
import { Input } from "@/ui/components/input"
import { Button } from "@/ui/components/button"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"

interface AccountServersSearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
    className?: string
}

export function AccountServersSearchBar({
    value,
    onChange,
    placeholder,
    className
}: AccountServersSearchBarProps) {
    const { t } = useLanguage()
    const searchPlaceholder = placeholder || t("profile.servers.searchPlaceholder")

    return (
        <div className={cn("relative w-full max-w-sm group", className)}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10">
                <Search className="h-4 w-4" />
            </div>
            <Input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-9 pr-9 h-10 rounded-xl bg-background border-border/80 focus-visible:ring-primary/20 text-sm shadow-xs transition-all"
            />
            {value && (
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
                        onClick={() => onChange("")}
                        aria-label={t("profile.servers.clearSearch")}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}
        </div>
    )
}
