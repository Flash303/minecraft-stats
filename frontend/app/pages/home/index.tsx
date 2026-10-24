import { useEffect, useCallback, useMemo, Suspense } from "react"
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
import { useSearch } from "@/core/hooks/useSearch"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { SERVERS_QUERY_KEY } from "@/core/lib/query-keys"

import { Hero3D } from "@/pages/home/components/Hero3D"
import { FaqSection } from "@/pages/home/components/FaqSection"
import { Pagination } from "@/ui/components/pagination"
import { PageContainer } from "@/ui/layout/PageContainer"

import type { LoaderFunctionArgs, MetaFunction } from "react-router"
import type { Language } from "@/core/lib/i18n"
import { resolveMetaLanguage, staticPageMeta, translateMeta, type DocumentMeta, type RouteMetaHandle } from "@/core/lib/seo-meta"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    return staticPageMeta({ ...homeMetaStrings(lang), path: "/" })
}

function homeMetaStrings(lang: Language): DocumentMeta {
    return {
        title: translateMeta(lang, "seo.homeTitle"),
        description: translateMeta(lang, "seo.homeDescription"),
    }
}

export const handle: RouteMetaHandle = {
    getDocumentMeta: (_data: unknown, lang: Language) => homeMetaStrings(lang),
}

// Reduce each server to what the home page actually needs before serializing
// it into the SSR HTML (~90% of the raw payload is unused: full client_infos,
// motd...). The client then performs its full fetch with `include_stats=true`,
// so no field listed here may be missing from the initial card render.
function toServerCardSummary(server: Server): Server {
    return {
        id: server.id,
        name: server.name,
        ip: server.ip,
        port: server.port,
        user_id: server.user_id,
        type: server.type,
        hidden: server.hidden,
        last_status: server.last_status,
        last_connected: server.last_connected,
        last_version: server.last_version,
        last_sample: server.last_sample,
        client_infos: {
            ...(server.client_infos?.lunar ? { lunar: { partner: server.client_infos.lunar.partner } } : {}),
            ...(server.client_infos?.laby ? { laby: { partner: server.client_infos.laby.partner } } : {}),
        },
    }
}

export async function loader({ request }: LoaderFunctionArgs) {
    const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip");
    // Disable stats for SSR to avoid a 4.6MB payload in the HTML.
    // React Query fetches the stats in the background on the client.
    const serversPromise = fetchServers(undefined, false, forwardedFor)
        .then((servers) => servers.map(toServerCardSummary))
        .catch((e) => {
            console.error("SSR Error:", e)
            return []
        })
    return { initialServersPromise: serversPromise }
}

export function shouldRevalidate({
    currentUrl,
    nextUrl,
    defaultShouldRevalidate
}: ShouldRevalidateFunctionArgs) {
    // Navigating within the same page (only query params changed): skip the fetch
    if (currentUrl.pathname === nextUrl.pathname) {
        return false
    }
    // Otherwise keep the default behavior
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
            <PageContainer className="scroll-mt-20 pt-8">
                {/* Placeholder for the filters */}
                <div className="mb-8 flex h-[72px] flex-col justify-between gap-4 border-b border-border/50 pb-4 sm:h-[56px] sm:flex-row sm:items-center"></div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ServerCardSkeleton key={i} />
                    ))}
                </div>
            </PageContainer>
        </>
    )
}

function ServerListContent({ initialServers }: { initialServers: Server[] }) {
    const { t } = useLanguage()
    const { userId, getToken, isSignedIn, isLoaded } = useAuth()
    const { isAdmin } = useAdmin()
    const { searchQuery } = useSearch()
    const [searchParams, setSearchParams] = useSearchParams()

    // Single source of truth: the TanStack Query cache, seeded with the SSR
    // data. It replaces the former duplicated load()/handleRefresh(), the
    // module-level caches and the manual refetch on mount.
    const { data: servers = initialServers || [], isPending, isFetching, error, refetch } = useQuery({
        queryKey: SERVERS_QUERY_KEY,
        queryFn: async () => {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            return fetchServers(token ?? undefined, true)
        },
        enabled: isLoaded,
        initialData: initialServers || [],
        // Considered stale as soon as seeded -> background refetch on mount,
        // equivalent to the former load(background=true).
        initialDataUpdatedAt: 0,
    })

    // Only show the skeleton when we REALLY have no data (isPending).
    // With initialData, isPending is false, so the skeleton never shows,
    // which prevents the SSR flicker.
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
    const activeLauncher = (launcherParam === "lunar" || launcherParam === "laby") ? launcherParam : (launcherParam === "labymod" ? "laby" : "all")

    const pageParam = searchParams.get("page")
    const currentPage = pageParam && !isNaN(Number(pageParam)) ? Math.max(1, Number(pageParam)) : 1

    const buildPageHref = useCallback(
        (page: number) => {
            const next = new URLSearchParams(searchParams)
            if (page <= 1) next.delete("page")
            else next.set("page", page.toString())
            const qs = next.toString()
            return qs ? `/?${qs}` : "/"
        },
        [searchParams]
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
    const setActiveLauncher = useCallback((launcher: "all" | "lunar" | "laby") => updateFilter("launcher", launcher, "all"), [updateFilter])

    // A single setSearchParams call: its functional form does not queue
    // updates made in the same tick (unlike setState).
    const resetFilters = useCallback(() => {
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete("platform")
                next.delete("launcher")
                next.delete("sort")
                next.delete("dir")
                next.delete("page")
                return next
            },
            { replace: true, preventScrollReset: true }
        )
    }, [setSearchParams])

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

    // Platform filtering
    const baseServersForCounts = useMemo(() => {
        let list = servers

        if (activePlatform === "java") {
            list = list.filter(s => s.type === "java")
        } else if (activePlatform === "bedrock") {
            list = list.filter(s => s.type === "bedrock")
        }

        // Launcher filtering
        if (activeLauncher === "lunar") {
            list = list.filter(s => s.client_infos?.lunar)
        } else if (activeLauncher === "laby") {
            list = list.filter(s => s.client_infos?.laby)
        }

        // Search bar filtering
        const query = searchQuery.toLowerCase().trim()
        if (query) {
            list = list.filter(
                (s) =>
                    s.name.toLowerCase().includes(query) ||
                    s.ip.toLowerCase().includes(query)
            )
        }

        return list
    }, [servers, searchQuery, activePlatform, activeLauncher])

    const filteredServers = useMemo(() => {
        let list = baseServersForCounts

        // Visibility filtering (hidden servers are only shown in their dedicated tab)
        if (activeTab === "hidden") {
            list = list.filter(s => s.hidden === true)
        } else {
            list = list.filter(s => s.hidden !== true)
        }

        // Status tab filtering
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

            <PageContainer id="server-list-section" className="scroll-mt-20 pt-8">
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
                    onResetFilters={resetFilters}
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
                                        buildPageHref={buildPageHref}
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
            </PageContainer>
            <FaqSection />
        </>
    )
}
