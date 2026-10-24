import { Languages } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/ui/components/select"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { getLanguageOption, LANGUAGES } from "@/core/lib/languages"
import type { Language } from "@/core/lib/i18n"
import { cn } from "@/core/lib/utils"

interface LanguageSelectProps {
    /**
     * `icon` — compact trigger for the header toolbar.
     * `full` — labelled trigger for the mobile menu / settings.
     */
    variant?: "icon" | "full"
    className?: string
}

/**
 * Language switcher shared by the desktop header and the mobile menu.
 * All supported languages live in `@/core/lib/languages` so both surfaces
 * always offer the same list.
 */
export function LanguageSelect({ variant = "icon", className }: LanguageSelectProps) {
    const { language, setLanguage, t } = useLanguage()
    const current = getLanguageOption(language)

    return (
        <Select value={language} onValueChange={(value: string) => setLanguage(value as Language)}>
            <SelectTrigger
                aria-label={t("header.selectLanguage")}
                className={cn(
                    "cursor-pointer border-none bg-transparent shadow-none hover:bg-muted focus-visible:bg-muted",
                    variant === "icon"
                        ? "size-10 shrink-0 justify-center px-0 [&_svg]:opacity-100"
                        : "h-9 w-auto min-w-0 gap-2 px-2 text-xs font-semibold [&_svg]:opacity-60",
                    className
                )}
            >
                {variant === "icon" ? (
                    <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
                ) : (
                    <span className="flex min-w-0 items-center gap-2">
                        <Languages aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">{current.label}</span>
                    </span>
                )}
            </SelectTrigger>
            <SelectContent align="end" className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
                {LANGUAGES.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="cursor-pointer">
                        <span lang={option.value}>{option.label}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
