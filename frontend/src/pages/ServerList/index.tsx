import { useState, useEffect, useCallback, useMemo } from "react"
import { Link } from "react-router-dom"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { Layout } from "@/components/layout"
import { useAuth } from "@clerk/react"
import { useSearch } from "@/contexts/SearchContext"
import { useLanguage } from "@/contexts/LanguageContext"

export function ServerList() {
    const { t } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const { searchQuery } = useSearch()
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

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
        const query = searchQuery.toLowerCase().trim()
        if (!query) return servers

        return servers.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.ip.toLowerCase().includes(query)
        )
    }, [servers, searchQuery])

    return (
        <Layout onRefresh={load} isLoading={loading}>
            {loading && servers.length === 0 && (
                <div className="flex justify-center py-20">
                    <p className="text-muted-foreground animate-pulse">{t("serverList.loading")}</p>
                </div>
            )}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20 text-center my-8">
                    {error}
                </div>
            )}
            {!loading && !error && (
                <>
                    {filteredServers.length > 0 ? (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                            {filteredServers.map((s) => (
                                <Link key={s.id} to={`/server/${s.id}`}>
                                    <ServerCard
                                        server={s}
                                    />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground italic">
                                {t("serverList.noResults", { query: searchQuery })}
                            </p>
                        </div>
                    )}
                </>
            )}
            {!loading && !error && servers.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-muted-foreground italic">{t("serverList.noServers")}</p>
                </div>
            )}
        </Layout>
    )
}
