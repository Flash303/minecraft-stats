import { useMemo, useState } from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/ui/components/button"
import { Input } from "@/ui/components/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/components/popover"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"

export interface TaxonomyMultiSelectOption {
    value: string
    label: string
    icon?: React.ReactNode
}

interface TaxonomyMultiSelectProps {
    label: string
    options: TaxonomyMultiSelectOption[]
    selected: readonly string[]
    onChange: (next: string[]) => void
}

function normalize(text: string): string {
    return text
        .normalize("NFD")
        .replace(/\p{M}+/gu, "")
        .toLowerCase()
}

/**
 * Single reusable picker for categories & languages, used by the creation
 * form, the edit modal and the home filters.
 *
 * Compact by design: a dropdown trigger with a count badge + removable chips,
 * the full option list (with search) lives inside the popover instead of
 * stretching the form/panel.
 */
export function TaxonomyMultiSelect({ label, options, selected, onChange }: TaxonomyMultiSelectProps) {
    const { t } = useLanguage()
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")

    const filtered = useMemo(() => {
        const q = normalize(query.trim())
        if (!q) return options
        return options.filter((o) => normalize(o.label).includes(q))
    }, [options, query])

    const toggle = (v: string) => {
        onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v])
    }

    const byValue = useMemo(() => new Map(options.map((o) => [o.value, o])), [options])

    return (
        <div className="flex flex-col gap-1.5">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        aria-label={label}
                        className={cn(
                            "w-full justify-between font-semibold",
                            selected.length > 0 && "border-primary/60 bg-primary/5"
                        )}
                    >
                        <span className="truncate">{label}</span>
                        <span className="flex shrink-0 items-center gap-1.5">
                            {selected.length > 0 && (
                                <span className="bg-primary text-primary-foreground flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-2xs font-bold">
                                    {selected.length}
                                </span>
                            )}
                            <ChevronDown aria-hidden="true" className="h-4 w-4 opacity-50" />
                        </span>
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 max-w-[calc(100vw-2rem)] overflow-hidden p-0" align="start">
                    <div className="border-border/60 border-b p-2">
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t("taxonomy.searchPlaceholder")}
                            className="h-9"
                        />
                    </div>
                    <div className="max-h-64 overflow-y-auto p-1.5">
                        {filtered.map((opt) => {
                            const active = selected.includes(opt.value)
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => toggle(opt.value)}
                                    className="hover:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors"
                                >
                                    <span
                                        className={cn(
                                            "border-border flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                                            active && "border-primary bg-primary text-primary-foreground"
                                        )}
                                    >
                                        {active && <Check aria-hidden="true" className="h-3 w-3" />}
                                    </span>
                                    {opt.icon}
                                    <span className="truncate font-medium">{opt.label}</span>
                                </button>
                            )
                        })}
                        {filtered.length === 0 && (
                            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
                                {t("taxonomy.noResults")}
                            </p>
                        )}
                    </div>
                </PopoverContent>
            </Popover>
            {selected.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {selected.map((v) => {
                        const opt = byValue.get(v)
                        if (!opt) return null
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => toggle(v)}
                                title={opt.label}
                                className="border-primary/25 bg-primary/10 text-primary inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md border px-1.5 py-0.5 text-2xs font-semibold transition-colors hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
                            >
                                {opt.icon}
                                <span className="truncate">{opt.label}</span>
                                <X aria-hidden="true" className="h-3 w-3 shrink-0" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
