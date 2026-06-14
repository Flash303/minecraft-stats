import { cn } from "@/lib/utils"

interface ServerListFiltersProps {
    activeTab: "all" | "online" | "offline" | "mine"
    setActiveTab: (tab: "all" | "online" | "offline" | "mine") => void
    totalCount: number
    onlineCount: number
    offlineCount: number
    myServersCount: number
    isSignedIn: boolean
}

export function ServerListFilters({
    activeTab,
    setActiveTab,
    totalCount,
    onlineCount,
    offlineCount,
    myServersCount,
    isSignedIn
}: ServerListFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-200/50 dark:border-zinc-800/50 pb-4">
            <div className="flex flex-wrap items-center gap-2">
                <button
                    onClick={() => setActiveTab("all")}
                    className={cn(
                        "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer",
                        activeTab === "all"
                            ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-955 shadow-sm"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    )}
                >
                    Tous ({totalCount})
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
                    En ligne ({onlineCount})
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
                    Hors ligne ({offlineCount})
                </button>
                {isSignedIn && (
                    <button
                        onClick={() => setActiveTab("mine")}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer flex items-center gap-1.5",
                            activeTab === "mine"
                                ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 shadow-sm font-bold"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                        )}
                    >
                        Mes serveurs ({myServersCount})
                    </button>
                )}
            </div>
            
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline-block">
                Actualisé en temps réel
            </span>
        </div>
    )
}
