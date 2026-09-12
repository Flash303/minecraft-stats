import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import {
    useSearchParams,
    useLoaderData,
    Await,
    type ShouldRevalidateFunctionArgs
} from "react-router"
import { useQuery } from "@tanstack/react-query"
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
    // On désactive les stats pour le SSR afin d'éviter une payload de 4.6MB dans le HTML.
    // React Query ira chercher les stats en arrière-plan sur le client.
    const serversPromise = fetchServers(undefined, false, forwardedFor).catch(() => [])
    return { initialServersPromise: serversPromise }
}

export function shouldRevalidate({
    currentUrl,
    nextUrl,
    defaultShouldRevalidate
}: ShouldRevalidateFunctionArgs) {
    // Si on navigue sur la même page (seuls les query params changent), on bloque le fetch
    if (currentUrl.pathname === nextUrl.pathname) {
        return false
    }
    // Sinon, on garde le comportement par défaut
    return defaultShouldRevalidate
}

export default function ServerList() {
    const loaderData = useLoaderData<typeof loader>()
    
    return (
        <Suspense fallback={<ServerListFallback />}>
            <Await resolve={loaderData.initialServersPromise}>
                {(servers) => <ServerListContent initialServers={servers} />}
            </Await>
        </Suspense>
    )
}

function ServerListFallback() {
    return (
        <>
            <Hero3D servers={[]} />
            <div className="mx-auto max-w-6xl scroll-mt-20 px-2 pt-8">
                {/* Espace réservé pour les filtres */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-border/50 pb-4 h-[72px]"></div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ServerCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        </>
    )
}

function ServerListContent({ initialServers }: { initialServers: Server[] }) {
    const { t } = useLanguage()
    const { getLunarInfo, getLabyInfo } = useClientInfo()
    const { userId, getToken, isSignedIn, isLoaded } = useAuth()
    const { isAdmin } = useAdmin()
    const { searchQuery } = useSearch()
    const [searchParams, setSearchParams] = useSearchParams()

    // Source unique de vérité : le cache TanStack Query, amorcé par les
    // données SSR. Remplace l'ancien doublon load()/handleRefresh(), les
    // caches module-level et le refetch manuel au montage.
    const { data: servers = initialServers || [], isPending, isFetching, error, refetch } = useQuery({
        queryKey: ["servers"],
        queryFn: async () => {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            return fetchServers(token ?? undefined, true)
        },
        enabled: isLoaded,
        initialData: initialServers || [],
        // Considéré comme périmé dès l'amorçage -> refetch d'arrière-plan au
        // montage, équivalent de l'ancien load(background=true).
        initialDataUpdatedAt: 0,
    })

    // On ne montre le skeleton que si on n'a VRAIMENT pas de données (isPending)
    // S'il y a initialData, isPending sera false, donc on ne montrera jamais le skeleton,
    // ce qui évite le clignotement SSR.
    const loading = isPending && servers.length === 0
    const refreshing = isFetching

    const tabParam = searchParams.get("tab")
    const activeTabState = (tabParam === "online" || tabParam === "offline" || tabParam === "hidden") ? tabParam : "all"
    const activeTab = (activeTabState === "hidden" && !isAdmin) ? "all" : activeTabState

    const platformParam = searchParams.get("platform")
    const activePlatform = (platformParam === "java" || platformParam === "bedrock") ? platformParam : "all"

    const sortParam = searchParams.get("sort")
    const activeSort = (sortParam === "name" || sortParam === "recent") ? sortParam : "popularity"

    const dirParam = searchParams.get("dir")
    const sortDirection = dirParam === "asc" ? "asc" : "desc"

    const launcherParam = searchParams.get("launcher")
    const activeLauncher = (launcherParam === "lunar" || launcherParam === "labymod") ? launcherParam : "all"

    const pageParam = searchParams.get("page")
    const currentPage = pageParam && !isNaN(Number(pageParam)) ? Math.max(1, Number(pageParam)) : 1

    const handlePageChange = useCallback(
        (page: number) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    if (page === 1) next.delete("page")
                    else next.set("page", page.toString())
                    return next
                },
                {
                    replace: true,
                    preventScrollReset: true
                }
            )
        },
        [setSearchParams]
    )

    const updateFilter = useCallback((key: string, value: string, defaultValue: string) => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                if (value === defaultValue) {
                    next.delete(key)
                } else {
                    next.set(key, value)
                }
                next.delete("page")
                return next
            },
            { replace: true, preventScrollReset: true }
        )
    }, [setSearchParams])

    const setActiveTab = useCallback((tab: "all" | "online" | "offline" | "hidden") => updateFilter("tab", tab, "all"), [updateFilter])
    const setActivePlatform = useCallback((platform: "all" | "java" | "bedrock") => updateFilter("platform", platform, "all"), [updateFilter])
    const setActiveSort = useCallback((sort: "popularity" | "name" | "recent") => updateFilter("sort", sort, "popularity"), [updateFilter])
    const setSortDirection = useCallback((dir: "desc" | "asc") => updateFilter("dir", dir, "desc"), [updateFilter])
    const setActiveLauncher = useCallback((launcher: "all" | "lunar" | "labymod") => updateFilter("launcher", launcher, "all"), [updateFilter])

    useEffect(() => {
        if (searchQuery) {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev)
                    if (next.has("page")) {
                        next.delete("page")
                        return next
                    }
                    return prev
                },
                { replace: true, preventScrollReset: true }
            )
        }
    }, [searchQuery, setSearchParams])

    // Filtrage par plateforme
    const baseServersForCounts = useMemo(() => {
        let list = servers

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
            {!searchQuery && <Hero3D servers={servers} />}

            <div
                id="server-list-section"
                className="mx-auto max-w-6xl scroll-mt-20 px-2 pt-8"
            >
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
                    onRefresh={() => refetch()}
                    isRefreshing={refreshing}
                />

                {(loading || (refreshing && servers.length === 0)) ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <ServerCardSkeleton key={i} />
                        ))}
                    </div>
                ) : null}
                {error && (
                    <div className="bg-destructive/10 text-destructive border-destructive/20 my-8 rounded-lg border p-4 text-center shadow-sm">
                        {t("serverList.error")}
                    </div>
                )}
                {!(loading || (refreshing && servers.length === 0)) && !error && (
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
                                        onPageChange={handlePageChange}
                                        className="mt-12 mb-8"
                                    />
                                )}
                            </>
                        ) : (
                            <div className="bg-muted/20 rounded-xl border-2 border-dashed py-20 text-center">
                                <p className="text-muted-foreground italic">
                                    {searchQuery
                                        ? t("serverList.noSearchResults", {
                                              query: searchQuery
                                          })
                                        : activeTab !== "all" ||
                                            activePlatform !== "all"
                                          ? t("serverList.noFilterResults")
                                          : t("serverList.noServers")}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    )
}
