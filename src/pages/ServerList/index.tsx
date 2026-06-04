import { useState, useEffect, useCallback, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { Layout } from "@/components/layout"
import { SearchBar } from "@/components/layout/SearchBar"

export function ServerList() {
    const navigate = useNavigate()
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState("")

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchServers()
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
            setError("Impossible de charger les serveurs")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    const filteredServers = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        if (!query) return servers

        return servers.filter(
            (s) =>
                s.name.toLowerCase().includes(query) ||
                s.ip.toLowerCase().includes(query)
        )
    }, [servers, searchQuery])

    const handleSelectServer = (server: Server) => {
        navigate(`/server/${server.id}`)
    }

    const headerRight = (
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
    )

    return (
        <Layout onRefresh={load} isLoading={loading} rightContent={headerRight}>
            {loading && servers.length === 0 && (
                <div className="flex justify-center py-20">
                    <p className="text-muted-foreground animate-pulse">Chargement des serveurs...</p>
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
                                <ServerCard
                                    key={s.id}
                                    server={s}
                                    onClick={handleSelectServer}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-muted-foreground italic">
                                Aucun serveur ne correspond à votre recherche "<strong>{searchQuery}</strong>".
                            </p>
                        </div>
                    )}
                </>
            )}
            {!loading && !error && servers.length === 0 && (
                <div className="text-center py-20">
                    <p className="text-muted-foreground italic">Aucun serveur trouvé.</p>
                </div>
            )}
        </Layout>
    )
}
