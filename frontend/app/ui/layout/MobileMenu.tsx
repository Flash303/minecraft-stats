import { Link } from "react-router"
import { ChevronRight } from "lucide-react"
import { VisuallyHidden } from "radix-ui"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/ui/components/sheet"
import { LanguageSelect } from "./LanguageSelect"
import { ThemeToggle } from "./ThemeToggle"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"

export interface MobileNavItem {
    to: string
    label: string
}

interface MobileMenuProps {
    id?: string
    open: boolean
    onOpenChange: (open: boolean) => void
    items: MobileNavItem[]
    activeRoute: string
}

function isItemActive(item: MobileNavItem, activeRoute: string) {
    return item.to.startsWith("/account")
        ? activeRoute.startsWith("/account")
        : activeRoute === item.to
}

/**
 * Slide-over navigation for phones and tablets (`< lg`).
 * Holds every destination plus the settings that do not fit in the compact
 * header toolbar (language, theme).
 */
export function MobileMenu({ id, open, onOpenChange, items, activeRoute }: MobileMenuProps) {
    const { t } = useLanguage()

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                id={id}
                side="right"
                aria-describedby={undefined}
                className="h-dvh w-[min(20rem,85vw)] max-w-none gap-0 overscroll-contain border-l bg-background px-4 pt-4 pb-6 sm:max-w-sm lg:hidden"
            >
                <VisuallyHidden.Root>
                    <SheetTitle>{t("header.navigation")}</SheetTitle>
                    <SheetDescription>{t("header.navigationDescription")}</SheetDescription>
                </VisuallyHidden.Root>

                <p className="mb-4 pr-10 text-xs font-bold tracking-widest text-muted-foreground uppercase">
                    {t("header.navigation")}
                </p>

                <nav aria-label={t("header.navigation")} className="flex flex-col gap-1">
                    {items.map((item) => {
                        const active = isItemActive(item, activeRoute)
                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => onOpenChange(false)}
                                aria-current={active ? "page" : undefined}
                                className={cn(
                                    "flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 text-sm font-semibold transition-colors",
                                    active
                                        ? "bg-primary/10 text-primary dark:bg-primary/20"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <span className="truncate">{item.label}</span>
                                <ChevronRight aria-hidden="true" className="size-4 shrink-0 opacity-50" />
                            </Link>
                        )
                    })}
                </nav>

                <div className="mt-auto space-y-3 border-t pt-4">
                    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/70 px-3">
                        <span className="text-sm font-semibold text-foreground">
                            {t("header.language")}
                        </span>
                        <LanguageSelect variant="full" />
                    </div>

                    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border/70 px-3">
                        <span className="text-sm font-semibold text-foreground">
                            {t("common.toggleTheme")}
                        </span>
                        <ThemeToggle />
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    )
}
