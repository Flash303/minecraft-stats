import { cn } from "@/core/lib/utils"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { ArrowUp, ArrowDown, ListFilter, X } from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/ui/components/popover"

interface ServerListFiltersProps {
    activeTab: "all" | "online" | "offline" | "hidden"
    setActiveTab: (tab: "all" | "online" | "offline" | "hidden") => void
    activePlatform: "all" | "java" | "bedrock"
    setActivePlatform: (platform: "all" | "java" | "bedrock") => void
    totalCount: number
    onlineCount: number
    offlineCount: number
    hiddenCount: number
    isAdmin: boolean
    activeSort: "popularity" | "name" | "recent"
    setActiveSort: (sort: "popularity" | "name" | "recent") => void
    sortDirection: "asc" | "desc"
    setSortDirection: (dir: "asc" | "desc") => void
    activeLauncher: "all" | "lunar" | "labymod"
    setActiveLauncher: (launcher: "all" | "lunar" | "labymod") => void
}

/** Bouton de filtre rapide (onglets de statut) */
function StatusTab({
    label,
    count,
    active,
    color,
    onClick,
}: {
    label: string
    count: number
    active: boolean
    color?: "green" | "red" | "amber"
    onClick: () => void
}) {
    const dotColors = {
        green: "bg-emerald-500",
        red: "bg-rose-500",
        amber: "bg-amber-500",
    }
    const activeStyles = {
        green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
        red: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25",
        amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25",
        default: "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm",
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                active
                    ? color
                        ? activeStyles[color]
                        : activeStyles.default
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
            )}
        >
            {color && (
                <span
                    className={cn(
                        "h-1.5 w-1.5 rounded-full flex-shrink-0",
                        dotColors[color],
                        color === "green" && "animate-pulse"
                    )}
                />
            )}
            {label}
            <span className={cn(
                "text-xs font-mono ml-0.5",
                active ? "opacity-80" : "opacity-50"
            )}>
                ({count})
            </span>
        </button>
    )
}

/** Contrôle segmenté générique */
function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[]
    value: T
    onChange: (val: T) => void
}) {
    return (
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-lg w-full">
            {options.map((opt) => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                        "flex-1 text-sm py-1.5 px-2 rounded-md font-medium transition-all text-center whitespace-nowrap",
                        value === opt.value
                            ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    )
}

/**
 * Contrôle de tri : affiche les options de tri, et sur l'option active,
 * un petit bouton ↑/↓ pour inverser la direction.
 */
function SortControl({
    options,
    value,
    direction,
    onChange,
    onToggleDirection,
}: {
    options: { value: string; label: string }[]
    value: string
    direction: "asc" | "desc"
    onChange: (val: string) => void
    onToggleDirection: () => void
}) {
    return (
        <div className="flex p-1 bg-slate-100 dark:bg-zinc-900 rounded-lg w-full gap-0.5">
            {options.map((opt) => {
                const isActive = value === opt.value
                return (
                    <div key={opt.value} className="flex-1 flex">
                        <button
                            onClick={() => {
                                if (isActive) {
                                    onToggleDirection()
                                } else {
                                    onChange(opt.value)
                                }
                            }}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1 text-sm py-1.5 px-2 rounded-md font-medium transition-all whitespace-nowrap",
                                isActive
                                    ? "bg-white dark:bg-zinc-800 shadow-sm text-foreground"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                            title={isActive
                                ? direction === "desc" ? "Croissant" : "Décroissant"
                                : opt.label}
                        >
                            {opt.label}
                            {isActive && (
                                direction === "asc"
                                    ? <ArrowUp className="w-3 h-3 text-primary" />
                                    : <ArrowDown className="w-3 h-3 text-primary" />
                            )}
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export function ServerListFilters({
    activeTab,
    setActiveTab,
    activePlatform,
    setActivePlatform,
    totalCount,
    onlineCount,
    offlineCount,
    hiddenCount,
    isAdmin,
    activeSort,
    setActiveSort,
    sortDirection,
    setSortDirection,
    activeLauncher,
    setActiveLauncher,
}: ServerListFiltersProps) {
    const { t } = useLanguage()

    const hasActiveFilters =
        activePlatform !== "all" ||
        activeLauncher !== "all" ||
        activeSort !== "popularity" ||
        sortDirection !== "desc"

    const activeFilterCount = [
        activePlatform !== "all",
        activeLauncher !== "all",
        activeSort !== "popularity" || sortDirection !== "desc",
    ].filter(Boolean).length

    const resetFilters = () => {
        setActivePlatform("all")
        setActiveLauncher("all")
        setActiveSort("popularity")
        setSortDirection("desc")
    }

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/50 dark:border-zinc-800/50 pb-4">
            {/* Onglets de statut */}
            <div className="flex flex-wrap items-center gap-1.5">
                <StatusTab
                    label={t("serverList.filters.all")}
                    count={totalCount}
                    active={activeTab === "all"}
                    onClick={() => setActiveTab("all")}
                />
                <StatusTab
                    label={t("serverList.filters.online")}
                    count={onlineCount}
                    active={activeTab === "online"}
                    color="green"
                    onClick={() => setActiveTab("online")}
                />
                <StatusTab
                    label={t("serverList.filters.offline")}
                    count={offlineCount}
                    active={activeTab === "offline"}
                    color="red"
                    onClick={() => setActiveTab("offline")}
                />
                {isAdmin && (
                    <StatusTab
                        label={t("serverList.filters.hidden")}
                        count={hiddenCount}
                        active={activeTab === "hidden"}
                        color="amber"
                        onClick={() => setActiveTab("hidden")}
                    />
                )}
            </div>

            {/* Bouton Filtres & Tri */}
            <div className="w-full sm:w-auto flex justify-end">
                <Popover>
                    <PopoverTrigger asChild>
                        <button
                            className={cn(
                                "relative flex items-center gap-2 px-4 py-2 h-10 rounded-xl text-sm font-medium border shadow-sm transition-colors",
                                hasActiveFilters
                                    ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-zinc-950 dark:border-white hover:bg-slate-800 dark:hover:bg-slate-100"
                                    : "bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                            )}
                        >
                            <ListFilter className="w-4 h-4 flex-shrink-0" />
                            <span>{t("serverList.filters.filterSort") || "Filtres & Tri"}</span>
                            {hasActiveFilters && (
                                <span className={cn(
                                    "flex items-center justify-center h-5 min-w-5 px-1 rounded-full text-[10px] font-bold",
                                    "bg-white/20 dark:bg-zinc-950/20"
                                )}>
                                    {activeFilterCount}
                                </span>
                            )}
                        </button>
                    </PopoverTrigger>

                    <PopoverContent
                        className="w-[340px] p-0 rounded-2xl shadow-xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden"
                        align="end"
                    >
                        {/* En-tête du popover */}
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800/80">
                            <span className="text-sm font-semibold text-foreground">
                                {t("serverList.filters.filterSort") || "Filtres & Tri"}
                            </span>
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    Réinitialiser
                                </button>
                            )}
                        </div>

                        <div className="p-5 space-y-5">
                            {/* TRI — cliquer sur l'option active inverse la direction */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {t("serverList.filters.sort")}
                                </p>
                                <SortControl
                                    value={activeSort}
                                    direction={sortDirection}
                                    options={[
                                        { value: "popularity", label: t("serverList.filters.sortPopularity") || "Popularité" },
                                        { value: "name", label: t("serverList.filters.sortName") || "Nom" },
                                        { value: "recent", label: t("serverList.filters.sortRecent") || "Récents" },
                                    ]}
                                    onChange={(v) => setActiveSort(v as "popularity" | "name" | "recent")}
                                    onToggleDirection={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                                />
                                <p className="text-[11px] text-muted-foreground/60 text-center">
                                    Cliquez à nouveau sur l'option active pour inverser l'ordre
                                </p>
                            </div>

                            <hr className="border-slate-100 dark:border-zinc-800/50" />

                            {/* LAUNCHER */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {t("serverList.filters.launcher") || "Launcher"}
                                </p>
                                <SegmentedControl
                                    value={activeLauncher}
                                    onChange={(v) => setActiveLauncher(v)}
                                    options={[
                                        { value: "all", label: t("serverList.filters.all") || "Tous" },
                                        { value: "lunar", label: "Lunar" },
                                        { value: "labymod", label: "LabyMod" },
                                    ]}
                                />
                            </div>

                            {/* PLATEFORME */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-muted-foreground">
                                    {t("serverList.filters.platform")}
                                </p>
                                <SegmentedControl
                                    value={activePlatform}
                                    onChange={(v) => setActivePlatform(v)}
                                    options={[
                                        { value: "all", label: t("serverList.filters.all") || "Tous" },
                                        { value: "java", label: t("serverList.filters.java") || "Java" },
                                        { value: "bedrock", label: t("serverList.filters.bedrock") || "Bedrock" },
                                    ]}
                                />
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    )
}
