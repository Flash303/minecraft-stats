import type { LucideIcon } from "lucide-react"
import {
    Tent,
    Palette,
    Shield,
    Cloud,
    Lock,
    Gamepad2,
    BedDouble,
    Swords,
    Scroll,
    Compass,
    Skull,
    Flame,
    Users,
    PawPrint,
    Building2,
    Box,
    Package,
    Drama,
    Target,
    Factory,
} from "lucide-react"
import { cn } from "@/core/lib/utils"
import type { TaxonomyMultiSelectOption } from "@/ui/components/TaxonomyMultiSelect"
import {
    SERVER_CATEGORIES,
    SERVER_LANGUAGES_API,
    getCategoryLabel,
    getLanguageLabel,
} from "@/core/lib/server-taxonomy"

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
    survival: Tent,
    creative: Palette,
    faction: Shield,
    skyblock: Cloud,
    prison: Lock,
    minigames: Gamepad2,
    bedwars: BedDouble,
    skywars: Swords,
    rpg: Scroll,
    adventure: Compass,
    hardcore: Skull,
    anarchy: Flame,
    smp: Users,
    pixelmon: PawPrint,
    citybuild: Building2,
    oneblock: Box,
    boxed: Package,
    roleplay: Drama,
    practice: Target,
    gens: Factory,
}

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
    const Icon = CATEGORY_ICONS[slug] ?? Tent
    return <Icon aria-hidden="true" className={cn("h-3 w-3 shrink-0", className)} />
}

/** API language code -> flagcdn country code (`en` has no flag: use `gb`). */
export const LANGUAGE_FLAG_CODES: Record<string, string> = {
    fr: "fr",
    en: "gb",
    es: "es",
    de: "de",
    pt: "pt",
    it: "it",
    nl: "nl",
    pl: "pl",
    ru: "ru",
    zh: "cn",
    ja: "jp",
    ko: "kr",
    ar: "sa",
    tr: "tr",
    he: "il",
    cs: "cz",
    fi: "fi",
    vi: "vn",
    sr: "rs",
    ro: "ro",
    ka: "ge",
    da: "dk",
}

export function LanguageFlag({ code, className }: { code: string; className?: string }) {
    const norm = code.trim().toLowerCase()
    const flagCode = LANGUAGE_FLAG_CODES[norm] ?? norm
    return (
        <img
            src={`https://flagcdn.com/w20/${flagCode}.png`}
            srcSet={`https://flagcdn.com/w40/${flagCode}.png 2x`}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            onError={(e) => {
                e.currentTarget.style.display = "none"
            }}
            className={cn("h-3 w-auto rounded-[1px] object-cover shadow-sm", className)}
        />
    )
}

/** Option lists for `TaxonomyMultiSelect`, with icons / flags included. */
export function getCategoryOptions(t: (key: string) => string): TaxonomyMultiSelectOption[] {
    return SERVER_CATEGORIES.map((c) => ({
        value: c,
        label: getCategoryLabel(c, t),
        icon: <CategoryIcon slug={c} />,
    }))
}

export function getLanguageOptions(t: (key: string) => string): TaxonomyMultiSelectOption[] {
    return SERVER_LANGUAGES_API.map((l) => ({
        value: l,
        label: getLanguageLabel(l, t),
        icon: <LanguageFlag code={l} />,
    }))
}
