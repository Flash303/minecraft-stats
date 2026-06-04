import { useState, useEffect, useCallback } from "react"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { ServerCard } from "@/components/ServerCard"
import { Header } from "@/components/Header"

interface ServerListProps {
    onSelectServer: (server: Server) => void
}

export function ServerList({ onSelectServer }: ServerListProps) {
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await fetchServers()
            setServers(data)
        } catch {
            setError("Failed to load servers")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    return (
        <div className="flex min-h-screen flex-col">
            <Header onRefresh={load} isLoading={loading} />
            <main className="container mx-auto flex-1 px-4 py-6">
                {loading && (
                    <p className="text-muted-foreground">Loading servers...</p>
                )}
                {error && <p className="text-destructive">{error}</p>}
                {!loading && !error && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {servers.map((s) => (
                            <ServerCard
                                key={s.id}
                                server={s}
                                onClick={onSelectServer}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
