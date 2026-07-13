import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { ServerListFilters } from "@/components/ServerList/ServerListFilters"
import { useLayoutConfig } from "@/components/layout"
import { useAuth } from "@clerk/react"
import { useAdmin } from "@/contexts/AdminContext"
import { useSearch } from "@/contexts/SearchContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { Hero3D } from "@/components/ServerList/Hero3D"

export function ServerList() {
    const { t } = useLanguage()
    const { userId, getToken, isSignedIn, isLoaded } = useAuth()
    const { isAdmin } = useAdmin()
    const { searchQuery } = useSearch()
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchParams, setSearchParams] = useSearchParams()
    const { setOnRefresh, setIsLoading } = useLayoutConfig()

    const activeTab = useMemo(() => {
        const tabParam = searchParams.get("tab")
        if (tabParam === "hidden" && !isAdmin) return "all"
        if (tabParam === "online" || tabParam === "offline" || tabParam === "hidden") {
            return tabParam as "all" | "online" | "offline" | "hidden"
        }
        return "all"
    }, [searchParams, isAdmin])

    const activePlatform = useMemo(() => {
        const platformParam = searchParams.get("platform")
        if (platformParam === "java" || platformParam === "bedrock") {
            return platformParam
        }
        return "all"
    }, [searchParams])

    const setActiveTab = useCallback((tab: "all" | "online" | "offline" | "hidden") => {
        const newParams = new URLSearchParams(searchParams)
        if (tab === "all") {
            newParams.delete("tab")
        } else {
            newParams.set("tab", tab)
        }
        setSearchParams(newParams)
    }, [searchParams, setSearchParams])

    const setActivePlatform = useCallback((platform: "all" | "java" | "bedrock") => {
        const newParams = new URLSearchParams(searchParams)
        if (platform === "all") {
            newParams.delete("platform")
        } else {
            newParams.set("platform", platform)
        }
        setSearchParams(newParams)
    }, [searchParams, setSearchParams])

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchServers(token ?? undefined, true)
            
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
        Promise.resolve().then(() => {
            load()
        })
    }, [load, isLoaded])

    useEffect(() => {
        setOnRefresh(() => load)
        return () => setOnRefresh(undefined)
    }, [load, setOnRefresh])

    useEffect(() => {
        setIsLoading(loading)
        return () => setIsLoading(undefined)
    }, [loading, setIsLoading])

    const baseServersForCounts = useMemo(() => {
        let list = servers

        // Filtrage par plateforme
        if (activePlatform === "java") {
            list = list.filter(s => s.type === "java")
        } else if (activePlatform === "bedrock") {
            list = list.filter(s => s.type === "bedrock")
        }

        // Filtrage par barre de recherche
        const query = searchQuery.toLowerCase().trim()
        if (query) {
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(query) ||
                    s.ip.toLowerCase().includes(query)
            )
        }

        return list
    }, [servers, searchQuery, activePlatform])

    const filteredServers = useMemo(() => {
        let list = baseServersForCounts

        // Filtrage par visibilité (les masqués ne sont vus que dans leur onglet spécifique)
        if (activeTab === "hidden") {
            list = list.filter(s => s.hidden === true)
        } else {
            list = list.filter(s => s.hidden !== true)
        }

        // Filtrage par onglet de statut
        if (activeTab === "online") {
            list = list.filter(s => s.last_status === "online")
        } else if (activeTab === "offline") {
            list = list.filter(s => s.last_status === "offline")
        }

        return list
    }, [baseServersForCounts, activeTab, userId])

    const visibleCount = useMemo(() => baseServersForCounts.filter(s => s.hidden !== true).length, [baseServersForCounts])
    const onlineCount = useMemo(() => baseServersForCounts.filter(s => s.last_status === "online" && s.hidden !== true).length, [baseServersForCounts])
    const offlineCount = useMemo(() => baseServersForCounts.filter(s => s.last_status === "offline" && s.hidden !== true).length, [baseServersForCounts])
    const hiddenCount = useMemo(() => baseServersForCounts.filter(s => s.hidden === true).length, [baseServersForCounts])

    return (
        <>
            {!searchQuery && <Hero3D />}
            
            <div id="server-list-section" className="pt-8 scroll-mt-20 max-w-6xl mx-auto px-2">
                <ServerListFilters
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    activePlatform={activePlatform}
                    setActivePlatform={setActivePlatform}
                    totalCount={visibleCount}
                    onlineCount={onlineCount}
                    offlineCount={offlineCount}
                    hiddenCount={hiddenCount}
                    isAdmin={isAdmin}
                />

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
                                    {searchQuery 
                                        ? t("serverList.noSearchResults", { query: searchQuery }) 
                                        : (activeTab !== "all" || activePlatform !== "all") 
                                            ? t("serverList.noFilterResults") 
                                            : t("serverList.noServers")}
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
        </>
    )
}
