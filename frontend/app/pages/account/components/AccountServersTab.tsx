import { useState, useMemo } from "react"
import type { Server } from "@/core/lib/api"
import { ServerCardSkeleton } from "@/pages/home/components/ServerCardSkeleton"
import { Server as ServerIcon, SearchX } from "lucide-react"
import { Button } from "@/ui/components/button"
import { Pagination } from "@/ui/components/pagination"
import { AccountServersSearchBar } from "./AccountServersSearchBar"
import { AccountServerCard } from "./AccountServerCard"

interface AccountServersTabProps {
    t: (key: string, options?: Record<string, string | number>) => string
    loading: boolean
    servers: Server[]
    loadData: () => void
}

const ITEMS_PER_PAGE = 6

export function AccountServersTab({ t, loading, servers, loadData }: AccountServersTabProps) {
    const [searchQuery, setSearchQuery] = useState("")
    const [currentPage, setCurrentPage] = useState(1)

    const handleSearchChange = (query: string) => {
        setSearchQuery(query)
        setCurrentPage(1)
    }

    const filteredServers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return servers

        return servers.filter((s) => {
            const nameMatch = s.name.toLowerCase().includes(query)
            const ipMatch = s.ip.toLowerCase().includes(query)
            return nameMatch || ipMatch
        })
    }, [servers, searchQuery])

    const totalPages = Math.max(1, Math.ceil(filteredServers.length / ITEMS_PER_PAGE))
    const safeCurrentPage = Math.min(currentPage, totalPages)

    const paginatedServers = useMemo(() => {
        const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE
        return filteredServers.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredServers, safeCurrentPage])

    return (
        <div className="space-y-6">
            {/* Header & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("profile.servers.title")}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{t("profile.servers.description")}</p>
                </div>

                {(servers.length > 0 || searchQuery) && (
                    <AccountServersSearchBar
                        value={searchQuery}
                        onChange={handleSearchChange}
                        placeholder={t("profile.servers.searchPlaceholder")}
                    />
                )}
            </div>

            {/* Content states */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <ServerCardSkeleton key={i} />
                    ))}
                </div>
            ) : servers.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center">
                    <ServerIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("profile.servers.noServersTitle")}</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">{t("profile.servers.noServersDescription")}</p>
                </div>
            ) : filteredServers.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center px-4">
                    <SearchX className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground text-sm max-w-md">
                        {t("profile.servers.noSearchResults", { query: searchQuery })}
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSearchChange("")}
                        className="mt-4 rounded-xl cursor-pointer text-xs"
                    >
                        {t("profile.servers.clearSearch")}
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedServers.map((s) => (
                            <AccountServerCard
                                key={s.id}
                                server={s}
                                onSuccess={loadData}
                            />
                        ))}
                    </div>

                    {totalPages > 1 && (
                        <Pagination
                            currentPage={safeCurrentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </>
            )}
        </div>
    )
}
