import { cn } from "@/lib/utils"
import { useLanguage } from "@/contexts/LanguageContext"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

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
    isAdmin
}: ServerListFiltersProps) {
    const { t } = useLanguage()

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/50 dark:border-zinc-800/50 pb-4">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                        activeTab === "all"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    {t("serverList.filters.all")} ({totalCount})
                </button>
                <button
                    onClick={() => setActiveTab("online")}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                        activeTab === "online"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 shadow-sm font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t("serverList.filters.online")} ({onlineCount})
                </button>
                <button
                    onClick={() => setActiveTab("offline")}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                        activeTab === "offline"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 shadow-sm font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    {t("serverList.filters.offline")} ({offlineCount})
                </button>
                {isAdmin && (
                    <button
                        onClick={() => setActiveTab("hidden")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                            activeTab === "hidden"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20 shadow-sm font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {t("serverList.filters.hidden")} ({hiddenCount})
                    </button>
                )}
            </div>
            
            <div className="w-full sm:w-auto">
                <Select
                    value={activePlatform}
                    onValueChange={(val) => setActivePlatform(val as "all" | "java" | "bedrock")}
                >
                    <SelectTrigger className="w-full sm:w-[180px] h-10 rounded-xl bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-sm text-sm font-medium">
                        <SelectValue placeholder={t("serverList.filters.platform")} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 dark:border-zinc-800 shadow-lg">
                        <SelectItem value="all" className="rounded-lg cursor-pointer">{t("serverList.filters.allPlatforms")}</SelectItem>
                        <SelectItem value="java" className="rounded-lg cursor-pointer">{t("serverList.filters.java")}</SelectItem>
                        <SelectItem value="bedrock" className="rounded-lg cursor-pointer">{t("serverList.filters.bedrock")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
