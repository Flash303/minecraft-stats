import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { Layout } from "@/components/layout"
import { useAuth } from "@clerk/react"
import { useSearch } from "@/contexts/SearchContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Hero3D } from "@/components/ServerList/Hero3D"
import { cn } from "@/lib/utils"

export function ServerList() {
    const { t } = useLanguage()
    const { userId, getToken, isSignedIn, isLoaded } = useAuth()
    const { searchQuery } = useSearch()
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()

    const activeTab = useMemo(() => {
        const tabParam = searchParams.get("tab")
        if (tabParam === "mine" && !isSignedIn) return "all"
        if (tabParam === "online" || tabParam === "offline" || tabParam === "mine") {
            return tabParam
        }
        return "all"
    }, [searchParams, isSignedIn])

    const setActiveTab = useCallback((tab: "all" | "online" | "offline" | "mine") => {
        const newParams = new URLSearchParams(searchParams)
        if (tab === "all") {
            newParams.delete("tab")
        } else {
            newParams.set("tab", tab)
        }
        setSearchParams(newParams)
    }, [searchParams, setSearchParams])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchServers(token ?? undefined)
            
            // Trie par nombre de connectés décroissant
            const sorted = [...data].sort((a, b) => {
                const countA = a.last_status === "online" ? (a.last_connected ?? 0) : -1
                const countB = b.last_status === "online" ? (b.last_connected ?? 0) : -1
                
                if (countB !== countA) {
                    return countB - countA
                }
                return b.id - a.id
            })
            setServers(sorted)
        } catch {
            setError(t("serverList.error"))
        } finally {
            setLoading(false)
        }
    }, [getToken, isSignedIn, isLoaded, t])

    useEffect(() => {
        if (!isLoaded) return
        load()
    }, [load, isLoaded])

    const filteredServers = useMemo(() => {
        let list = servers

        // Filtrage par onglet de statut
        if (activeTab === "online") {
            list = list.filter(s => s.last_status === "online")
        } else if (activeTab === "offline") {
            list = list.filter(s => s.last_status === "offline")
        } else if (activeTab === "mine") {
            list = list.filter(s => s.user_id === userId)
        }

        // Filtrage par barre de recherche
        const query = searchQuery.toLowerCase().trim()
        if (!query) return list

        return list.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.ip.toLowerCase().includes(query)
        )
    }, [servers, searchQuery, activeTab, userId])

    const onlineCount = useMemo(() => servers.filter(s => s.last_status === "online").length, [servers])
    const offlineCount = useMemo(() => servers.filter(s => s.last_status === "offline").length, [servers])
    const myServersCount = useMemo(() => {
        if (!userId) return 0
        return servers.filter(s => s.user_id === userId).length
    }, [servers, userId])

    return (
        <Layout onRefresh={load} isLoading={loading}>
            {!searchQuery && <Hero3D />}
            
            <div id="server-list-section" className="pt-8 scroll-mt-20 max-w-6xl mx-auto px-2">
                {/* Filtres par onglets de catégorie */}
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
                            Tous ({servers.length})
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
                                        ? "bg-indigo-500/10 text-indigo-650 dark:text-indigo-400 border border-indigo-500/20 shadow-sm font-bold"
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

                {loading && servers.length === 0 && (
                    <div className="flex justify-center py-20">
                        <p className="text-muted-foreground animate-pulse">{t("serverList.loading")}</p>
                    </div>
                )}
                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 text-center my-8 shadow-sm">
                        {error}
                    </div>
                )}
                {!loading && !error && (
                    <>
                        {filteredServers.length > 0 ? (
                            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                                {filteredServers.map((s) => (
                                    <Link key={s.id} to={`/server/${s.id}`} className="block focus:outline-none">
                                        <ServerCard
                                            server={s}
                                        />
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                                <p className="text-muted-foreground italic">
                                    {t("serverList.noResults", { query: searchQuery })}
                                </p>
                            </div>
                        )}
                    </>
                )}
                {!loading && !error && servers.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <p className="text-muted-foreground italic">{t("serverList.noServers")}</p>
                    </div>
                )}
            </div>
        </Layout>
    )
}
