import { useLanguage } from "@/core/contexts/LanguageContext"
import { getCategoryLabel, getLanguageLabel, toUiLanguage } from "@/core/lib/server-taxonomy"
import { CategoryIcon, LanguageFlag } from "@/ui/components/TaxonomyIcons"
import { cn } from "@/core/lib/utils"

interface TaxonomyBadgesProps {
    categories?: readonly string[]
    languages?: readonly string[]
    maxCategories?: number
    maxLanguages?: number
    /** `"flag"` = drapeau seul (cartes compactes), `"label"` = drapeau + nom (défaut). */
    languageDisplay?: "flag" | "label"
    className?: string
}

/**
 * Compact badges for cards / headers / table rows. Never overflows: extra
 * items collapse into a `+n` badge with the full list in `title`.
 */
export function TaxonomyBadges({
    categories = [],
    languages = [],
    maxCategories = 2,
    maxLanguages = 2,
    languageDisplay = "label",
    className,
}: TaxonomyBadgesProps) {
    const { t } = useLanguage()

    const cats = (categories ?? []).filter(Boolean)
    const langs = (languages ?? []).filter(Boolean)
    if (cats.length === 0 && langs.length === 0) return null

    const visibleCats = cats.slice(0, maxCategories).map((c) => ({ value: c, label: getCategoryLabel(c, t) }))
    const hiddenCats = cats.slice(maxCategories).map((c) => getCategoryLabel(c, t))
    const visibleLangs = langs.slice(0, maxLanguages).map((l) => ({
        value: l,
        label: getLanguageLabel(l, t),
        code: toUiLanguage(l).toUpperCase(),
    }))
    const hiddenLangs = langs.slice(maxLanguages).map((l) => getLanguageLabel(l, t))
    const hiddenCount = cats.length - visibleCats.length + (langs.length - visibleLangs.length)

    return (
        <div className={cn("flex min-w-0 flex-wrap items-center gap-1", className)}>
            {visibleCats.map(({ value, label }) => (
                <span
                    key={`cat-${value}`}
                    className="inline-flex max-w-[140px] items-center gap-1 truncate rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-2xs font-semibold text-primary"
                    title={label}
                >
                    <CategoryIcon slug={value} />
                    <span className="truncate">{label}</span>
                </span>
            ))}
            {visibleLangs.map(({ value, label, code }) => (
                <span
                    key={`lang-${value}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/60 px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground"
                    title={`${code} — ${label}`}
                >
                    <LanguageFlag code={value} />
                    {languageDisplay === "label" && <span>{label}</span>}
                </span>
            ))}
            {hiddenCount > 0 && (
                <span
                    className="inline-flex items-center rounded-md border border-dashed border-border/60 px-1.5 py-0.5 text-2xs font-semibold text-muted-foreground"
                    title={[...hiddenCats, ...hiddenLangs].join(", ")}
                >
                    +{hiddenCount}
                </span>
            )}
        </div>
    )
}
