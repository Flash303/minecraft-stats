import React, { useState } from "react"
import { cn } from "@/core/lib/utils"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useMediaQuery } from "@/core/hooks/useMediaQuery"
import {
    ArrowUp,
    ArrowDown,
    ListFilter,
    X,
    Flame,
    ArrowDownAZ,
    Clock,
    Globe,
    RotateCw,
} from "lucide-react"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/ui/components/popover"
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
    DrawerTitle,
    DrawerDescription,
} from "@/ui/components/drawer"
import { VisuallyHidden } from "radix-ui"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"
import { JavaLogo } from "@/ui/components/JavaLogo"
import { BedrockLogo } from "@/ui/components/BedrockLogo"

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
    onRefresh?: () => void
    isRefreshing?: boolean
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
        green: "bg-success",
        red: "bg-destructive",
        amber: "bg-warning",
    }
    const activeStyles = {
        green: "bg-success/10 text-success border border-success/25",
        red: "bg-destructive/10 text-destructive border border-destructive/25",
        amber: "bg-warning/10 text-warning border border-warning/25",
        default: "bg-primary text-primary-foreground shadow-sm",
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
            <span
                className={cn(
                    "text-xs font-mono ml-0.5",
                    active ? "opacity-80" : "opacity-50"
                )}
            >
                ({count})
            </span>
        </button>
    )
}

/** Contrôle segmenté générique avec icônes */
function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string; icon?: React.ReactNode }[]
    value: T
    onChange: (val: T) => void
}) {
    return (
        <div className="flex p-1 bg-muted rounded-xl w-full gap-1">
            {options.map((opt) => {
                const isActive = value === opt.value
                return (
                    <button
                        key={opt.value}
                        onClick={() => onChange(opt.value)}
                        className={cn(
                            "flex-1 min-w-0 flex items-center justify-center gap-1.5 text-xs sm:text-sm py-2 px-2 rounded-lg font-medium transition-all text-center whitespace-nowrap cursor-pointer",
                            isActive
                                ? "bg-card shadow-sm text-foreground font-semibold"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                    >
                        {opt.icon && (
                            <span className="shrink-0 flex items-center justify-center">
                                {opt.icon}
                            </span>
                        )}
                        <span className="truncate">{opt.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

/**
 * Contrôle de tri : affiche les options de tri avec icônes, et sur l'option active,
 * un bouton ↑/↓ pour inverser la direction.
 */
function SortControl({
    options,
    value,
    direction,
    onChange,
    onToggleDirection,
}: {
    options: { value: string; label: string; icon?: React.ReactNode }[]
    value: string
    direction: "asc" | "desc"
    onChange: (val: string) => void
    onToggleDirection: () => void
}) {
    return (
        <div className="flex p-1 bg-muted rounded-xl w-full gap-1">
            {options.map((opt) => {
                const isActive = value === opt.value
                const flexClass =
                    opt.value === "popularity"
                        ? "flex-[1.3]"
                        : opt.value === "name"
                        ? "flex-[0.7]"
                        : "flex-1"

                return (
                    <div key={opt.value} className={cn("min-w-0 flex", flexClass)}>
                        <button
                            onClick={() => {
                                if (isActive) {
                                    onToggleDirection()
                                } else {
                                    onChange(opt.value)
                                }
                            }}
                            className={cn(
                                "w-full flex items-center justify-center gap-1.5 text-xs py-2 px-1.5 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer",
                                isActive
                                    ? "bg-card shadow-sm text-foreground font-semibold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                            )}
                            title={
                                isActive
                                    ? direction === "desc"
                                        ? "Ordre croissant"
                                        : "Ordre décroissant"
                                    : opt.label
                            }
                        >
                            {opt.icon && (
                                <span className="shrink-0 flex items-center justify-center">
                                    {opt.icon}
                                </span>
                            )}
                            <span className="shrink-0">{opt.label}</span>
                            {isActive && (
                                direction === "asc" ? (
                                    <ArrowUp aria-hidden="true" className="w-3.5 h-3.5 text-primary shrink-0 ml-0.5" />
                                ) : (
                                    <ArrowDown aria-hidden="true" className="w-3.5 h-3.5 text-primary shrink-0 ml-0.5" />
                                )
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
    onRefresh,
    isRefreshing,
}: ServerListFiltersProps) {
    const { t } = useLanguage()
    const isDesktop = useMediaQuery("(min-width: 640px)")
    const [open, setOpen] = useState(false)

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

    const FilterContent = () => (
        <>
            {/* En-tête (affiché uniquement sur Desktop ou dans le Drawer pour le bouton reset) */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/80">
                <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ListFilter aria-hidden="true" className="w-4 h-4 text-primary" />
                    {t("serverList.filters.filterSort") || "Filtres & Tri"}
                </span>
                {hasActiveFilters && (
                    <button
                        onClick={resetFilters}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                        <X aria-hidden="true" className="w-3.5 h-3.5" />
                        Réinitialiser
                    </button>
                )}
            </div>

            <div className="p-5 space-y-5">
                {/* TRI */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">
                            {t("serverList.filters.sort")}
                        </p>
                        <span className="text-[10px] text-muted-foreground/60">
                            {directionText(sortDirection)}
                        </span>
                    </div>
                    <SortControl
                        value={activeSort}
                        direction={sortDirection}
                        options={[
                            {
                                value: "popularity",
                                label: t("serverList.filters.sortPopularity") || "Populaire",
                                icon: <Flame aria-hidden="true" className="w-3.5 h-3.5 text-amber-500" />,
                            },
                            {
                                value: "name",
                                label: t("serverList.filters.sortName") || "Nom",
                                icon: <ArrowDownAZ aria-hidden="true" className="w-3.5 h-3.5 text-primary" />,
                            },
                            {
                                value: "recent",
                                label: t("serverList.filters.sortRecent") || "Récents",
                                icon: <Clock aria-hidden="true" className="w-3.5 h-3.5 text-info" />,
                            },
                        ]}
                        onChange={(v) => setActiveSort(v as "popularity" | "name" | "recent")}
                        onToggleDirection={() =>
                            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                        }
                    />
                    <p className="text-[11px] text-muted-foreground/60 text-center">
                        Cliquez à nouveau sur l'option active pour inverser l'ordre
                    </p>
                </div>

                <hr className="border-border/50" />

                {/* LAUNCHER */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                        {t("serverList.filters.launcher") || "Launcher"}
                    </p>
                    <SegmentedControl
                        value={activeLauncher}
                        onChange={(v) => setActiveLauncher(v)}
                        options={[
                            {
                                value: "all",
                                label: t("serverList.filters.all") || "Tous",
                                icon: <Globe aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground/80" />,
                            },
                            {
                                value: "lunar",
                                label: "Lunar",
                                icon: <LunarLogo className="w-3.5 h-3.5 text-sky-500" />,
                            },
                            {
                                value: "labymod",
                                label: "LabyMod",
                                icon: <LabyLogo className="w-3.5 h-3.5 text-foreground" />,
                            },
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
                            {
                                value: "all",
                                label: t("serverList.filters.all") || "Tous",
                                icon: <Globe aria-hidden="true" className="w-3.5 h-3.5 text-muted-foreground/80" />,
                            },
                            {
                                value: "java",
                                label: t("serverList.filters.java") || "Java",
                                icon: <JavaLogo className="w-3.5 h-3.5 text-amber-500" />,
                            },
                            {
                                value: "bedrock",
                                label: t("serverList.filters.bedrock") || "Bedrock",
                                icon: <BedrockLogo className="w-3.5 h-3.5" />,
                            },
                        ]}
                    />
                </div>
            </div>
        </>
    )

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border/50 pb-4">
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

            {/* Actions: Actualiser & Filtres/Tri */}
            <div className="w-full sm:w-auto flex items-center justify-end gap-2">
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        title={t("common.refresh")}
                        aria-label={t("common.refresh")}
                        className={cn(
                            "flex items-center gap-2 px-3.5 py-2 h-10 rounded-xl text-sm font-medium border shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                            "bg-card border-border text-foreground hover:bg-accent active:scale-95"
                        )}
                    >
                        <RotateCw aria-hidden="true" className={cn("w-4 h-4 text-muted-foreground", isRefreshing && "animate-spin text-primary")} />
                        <span className="hidden xs:inline text-xs font-semibold">
                            {isRefreshing ? t("common.loading") : t("common.refresh")}
                        </span>
                    </button>
                )}

                {isDesktop ? (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <button
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-2 h-10 rounded-xl text-sm font-medium border shadow-sm transition-colors cursor-pointer",
                                    hasActiveFilters
                                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                        : "bg-card border-border text-foreground hover:bg-accent"
                                )}
                            >
                                <ListFilter aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
                                <span>{t("serverList.filters.filterSort") || "Filtres & Tri"}</span>
                                {hasActiveFilters && (
                                    <span
                                        className={cn(
                                            "flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold",
                                            "bg-white/20 dark:bg-zinc-950/20"
                                        )}
                                    >
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 rounded-2xl shadow-2xl border-border bg-white dark:bg-zinc-950 overflow-hidden"
                            align="end"
                        >
                            {FilterContent()}
                        </PopoverContent>
                    </Popover>
                ) : (
                    <Drawer open={open} onOpenChange={setOpen}>
                        <DrawerTrigger asChild>
                            <button
                                className={cn(
                                    "relative flex items-center gap-2 px-4 py-2 h-10 rounded-xl text-sm font-medium border shadow-sm transition-colors cursor-pointer",
                                    hasActiveFilters
                                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                                        : "bg-card border-border text-foreground hover:bg-accent"
                                )}
                            >
                                <ListFilter aria-hidden="true" className="w-4 h-4 flex-shrink-0" />
                                <span>{t("serverList.filters.filterSort") || "Filtres & Tri"}</span>
                                {hasActiveFilters && (
                                    <span
                                        className={cn(
                                            "flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full text-[10px] font-bold",
                                            "bg-white/20 dark:bg-zinc-950/20"
                                        )}
                                    >
                                        {activeFilterCount}
                                    </span>
                                )}
                            </button>
                        </DrawerTrigger>
                        <DrawerContent>
                            <VisuallyHidden.Root>
                                <DrawerTitle>Filtres de serveurs</DrawerTitle>
                                <DrawerDescription>Affinez la liste des serveurs affichés.</DrawerDescription>
                            </VisuallyHidden.Root>
                            {FilterContent()}
                        </DrawerContent>
                    </Drawer>
                )}
            </div>
        </div>
    )
}

function directionText(dir: "asc" | "desc") {
    return dir === "desc" ? "Décroissant" : "Croissant"
}
