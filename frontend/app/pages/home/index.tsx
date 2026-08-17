import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useSearchParams, useLoaderData, Await } from "react-router"
import { fetchServers } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"
import { ServerCard } from "@/pages/home/components/ServerCard"
import { ServerCardSkeleton } from "@/pages/home/components/ServerCardSkeleton"
import { ServerListFilters } from "@/pages/home/components/ServerListFilters"
import { useAuth } from "@clerk/react"
import { useAdmin } from "@/core/contexts/AdminContext"
import { useSearch } from "@/core/contexts/SearchContext"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useClientInfo } from "@/core/contexts/ClientInfoContext"
import { Hero3D } from "@/pages/home/components/Hero3D"
import { Pagination } from "@/ui/components/pagination"

import type { LoaderFunctionArgs } from "react-router"

export async function loader({ request }: LoaderFunctionArgs) {
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip");
    const serversPromise = fetchServers(undefined, true, forwardedFor).catch(() => [])
    return { initialServersPromise: serversPromise }
}

export default function ServerList() {
    const loaderData = useLoaderData<typeof loader>()
    
    return (
        <Suspense fallback={<ServerListContent initialServers={[]} isDeferredLoading={true} />}>
            <Await resolve={loaderData.initialServersPromise}>
                {(servers) => <ServerListContent initialServers={servers} isDeferredLoading={false} />}
            </Await>
        </Suspense>
    )
}

function ServerListContent({ initialServers, isDeferredLoading = false }: { initialServers: Server[], isDeferredLoading?: boolean }) {
    const { t } = useLanguage()
    const { getLunarInfo, getLabyInfo } = useClientInfo()
    const { userId, getToken, isSignedIn, isLoaded } = useAuth()
    const { isAdmin } = useAdmin()
    const { searchQuery } = useSearch()
    const [servers, setServers] = useState<Server[]>(initialServers || [])
    const [loading, setLoading] = useState(isDeferredLoading)
    const [error, setError] = useState<string | null>(null)
    const [searchParams] = useSearchParams()

    const [activeTabState, setActiveTabState] = useState<"all" | "online" | "offline" | "hidden">(() => {
        const tabParam = searchParams.get("tab")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (tabParam === "online" || tabParam === "offline" || tabParam === "hidden") return tabParam as any
        return "all"
    })
    
    const activeTab = (activeTabState === "hidden" && !isAdmin) ? "all" : activeTabState

    const [activePlatform, setActivePlatformState] = useState<"all" | "java" | "bedrock">(() => {
        const platformParam = searchParams.get("platform")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (platformParam === "java" || platformParam === "bedrock") return platformParam as any
        return "all"
    })

    const [activeSort, setActiveSortState] = useState<"popularity" | "name" | "recent">(() => {
        const sortParam = searchParams.get("sort")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (sortParam === "name" || sortParam === "recent") return sortParam as any
        return "popularity"
    })

    const [sortDirection, setSortDirectionState] = useState<"desc" | "asc">(() => {
        const dirParam = searchParams.get("dir")
        if (dirParam === "asc") return "asc"
        return "desc"
    })

    const [activeLauncher, setActiveLauncherState] = useState<"all" | "lunar" | "labymod">(() => {
        const launcherParam = searchParams.get("launcher")
        if (launcherParam === "lunar" || launcherParam === "labymod") return launcherParam as "lunar" | "labymod"
        return "all"
    })

    const [currentPage, setCurrentPage] = useState<number>(() => {
        const pageParam = searchParams.get("page")
        if (pageParam && !isNaN(Number(pageParam))) return Math.max(1, Number(pageParam))
        return 1
    })

    const setActiveTab = useCallback((tab: "all" | "online" | "offline" | "hidden") => {
        setActiveTabState(tab)
        setCurrentPage(1)
    }, [])

    const setActivePlatform = useCallback((platform: "all" | "java" | "bedrock") => {
        setActivePlatformState(platform)
        setCurrentPage(1)
    }, [])

    const setActiveSort = useCallback((sort: "popularity" | "name" | "recent") => {
        setActiveSortState(sort)
        setCurrentPage(1)
    }, [])

    const setSortDirection = useCallback((dir: "desc" | "asc") => {
        setSortDirectionState(dir)
        setCurrentPage(1)
    }, [])

    const setActiveLauncher = useCallback((launcher: "all" | "lunar" | "labymod") => {
        setActiveLauncherState(launcher)
        setCurrentPage(1)
    }, [])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1)
    }, [searchQuery])

    const [refreshing, setRefreshing] = useState(false)

    const load = useCallback(async (background = false) => {
        if (!background) setLoading(true)
        setError(null)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchServers(token ?? undefined, true)
            if (data && data.length > 0) {
                setServers(data)
            }
        } catch {
            // Keep existing servers on client fetch failure
        } finally {
            setLoading(false)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getToken, isSignedIn, isLoaded, t])

    const handleRefresh = useCallback(async () => {
        setRefreshing(true)
        setError(null)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchServers(token ?? undefined, true)
            if (data) {
                setServers(data)
            }
        } catch (err) {
            console.error("Failed to refresh servers:", err)
        } finally {
            setRefreshing(false)
        }
    }, [getToken, isSignedIn, isLoaded])

    useEffect(() => {
        if (!isLoaded || isDeferredLoading) return
        Promise.resolve().then(() => {
            load(true) // Run as background fetch to avoid UI flashing
        })
    }, [load, isLoaded, isDeferredLoading])

    const baseServersForCounts = useMemo(() => {
        let list = servers

        // Filtrage par plateforme
        if (activePlatform === "java") {
            list = list.filter(s => s.type === "java")
        } else if (activePlatform === "bedrock") {
            list = list.filter(s => s.type === "bedrock")
        }

        // Filtrage par launcher
        if (activeLauncher === "lunar") {
            list = list.filter(s => getLunarInfo(s.ip))
        } else if (activeLauncher === "labymod") {
            list = list.filter(s => getLabyInfo(s.ip))
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
    }, [servers, searchQuery, activePlatform, activeLauncher, getLunarInfo, getLabyInfo])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [baseServersForCounts, activeTab, userId])

    const ITEMS_PER_PAGE = 12

    const sortedServers = useMemo(() => {
        const list = [...filteredServers]
        list.sort((a, b) => {
            let res = 0
            if (activeSort === "popularity") {
                const countA = a.last_status === "online" ? (a.last_connected ?? 0) : -1
                const countB = b.last_status === "online" ? (b.last_connected ?? 0) : -1
                if (countB !== countA) {
                    res = countB - countA
                } else {
                    res = b.id - a.id
                }
            } else if (activeSort === "name") {
                res = a.name.localeCompare(b.name)
            } else if (activeSort === "recent") {
                res = b.id - a.id
            }
            return sortDirection === "desc" ? res : -res
        })
        return list
    }, [filteredServers, activeSort, sortDirection])

    const totalPages = Math.ceil(sortedServers.length / ITEMS_PER_PAGE) || 1
    const safeCurrentPage = Math.min(currentPage, totalPages)

    const paginatedServers = useMemo(() => {
        const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
        return sortedServers.slice(start, start + ITEMS_PER_PAGE)
    }, [sortedServers, safeCurrentPage])

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
                    activeLauncher={activeLauncher}
                    setActiveLauncher={setActiveLauncher}
                    totalCount={visibleCount}
                    onlineCount={onlineCount}
                    offlineCount={offlineCount}
                    hiddenCount={hiddenCount}
                    isAdmin={isAdmin}
                    activeSort={activeSort}
                    setActiveSort={setActiveSort}
                    sortDirection={sortDirection}
                    setSortDirection={setSortDirection}
                    onRefresh={handleRefresh}
                    isRefreshing={refreshing}
                />

                {loading && servers.length === 0 && (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ServerCardSkeleton key={i} />
                        ))}
                    </div>
                )}
                {error && (
                    <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 text-center my-8 shadow-sm">
                        {error}
                    </div>
                )}
                {!loading && !error && (
                    <>
                        {paginatedServers.length > 0 ? (
                            <>
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                                    {paginatedServers.map((s) => (
                                        <ServerCard
                                            key={s.id}
                                            server={s}
                                            to={`/server/${s.id}`}
                                        />
                                    ))}
                                </div>
                                {totalPages > 1 && (
                                    <Pagination
                                        currentPage={safeCurrentPage}
                                        totalPages={totalPages}
                                        onPageChange={setCurrentPage}
                                        className="mt-12 mb-8"
                                    />
                                )}
                            </>
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
