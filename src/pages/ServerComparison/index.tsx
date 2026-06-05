import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { fetchServers, fetchRecords } from "@/lib/api"
import type { Server } from "@/lib/api"
import { Layout } from "@/components/layout"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { X, Search, BarChart3 } from "lucide-react"
import { MultiServerChart } from "./MultiServerChart"
import { useAuth } from "@clerk/react"
import { cn } from "@/lib/utils"
import type uPlot from "uplot"

const TIME_RANGES = [
    { label: "Dernière heure", value: 3600000 },
    { label: "Dernières 6 heures", value: 21600000 },
    { label: "Dernières 24 heures", value: 86400000 },
    { label: "Derniers 7 jours", value: 604800000 },
    { label: "Derniers 30 jours", value: 2592000000 }
]

const INTERVALS = [
    { label: "10 sec", value: 10000 },
    { label: "1 min", value: 60000 },
    { label: "5 min", value: 300000 },
    { label: "30 min", value: 1800000 },
    { label: "1 heure", value: 3600000 }
]

export function ServerComparison() {
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [allServers, setAllServers] = useState<Server[]>([])
    const [selectedServers, setSelectedServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [recordsMap, setRecordsMap] = useState<{ [serverId: number]: { date: number; value: number }[] }>({})
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[2].value)
    const [selectedInterval, setSelectedInterval] = useState(INTERVALS[1].value)
    const [showSuggestions, setShowSuggestions] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const loadAll = async () => {
            try {
                const token = isLoaded && isSignedIn ? await getToken() : undefined
                const data = await fetchServers(token ?? undefined)
                setAllServers(data)
            } catch (err) {
                console.error("Failed to load servers", err)
            }
        }
        if (isLoaded) loadAll()
    }, [isLoaded, isSignedIn, getToken])

    const fetchServerRecords = useCallback(async (server: Server) => {
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const from = Math.floor((Date.now() - selectedRange) / 1000)
            const data = await fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            setRecordsMap(prev => ({ ...prev, [server.id]: data }))
        } catch (err) {
            console.error(`Failed to load records for server ${server.id}`, err)
        }
    }, [selectedRange, selectedInterval, isLoaded, isSignedIn, getToken])

    useEffect(() => {
        const refreshAll = async () => {
            setLoadingRecords(true)
            await Promise.all(selectedServers.map(s => fetchServerRecords(s)))
            setLoadingRecords(false)
        }
        if (selectedServers.length > 0) refreshAll()
        else setRecordsMap({})
    }, [selectedServers, selectedRange, selectedInterval, fetchServerRecords])

    const filteredSuggestions = useMemo(() => {
        if (!searchQuery.trim()) return []
        return allServers.filter(s => 
            (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             s.ip.toLowerCase().includes(searchQuery.toLowerCase())) &&
            !selectedServers.find(sel => sel.id === s.id)
        ).slice(0, 5)
    }, [allServers, searchQuery, selectedServers])

    const addServer = (server: Server) => {
        setSelectedServers(prev => [...prev, server])
        setSearchQuery("")
        setShowSuggestions(false)
    }

    const removeServer = (serverId: number) => {
        setSelectedServers(prev => prev.filter(s => s.id !== serverId))
        setRecordsMap(prev => {
            const next = { ...prev }
            delete next[serverId]
            return next
        })
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredSuggestions.length > 0) {
            addServer(filteredSuggestions[0])
        }
    }

    const chartData = useMemo<uPlot.AlignedData>(() => {
        if (selectedServers.length === 0) return [[], []]

        const MAX_GAP_SECONDS = 30 * 60

        // Collect all unique timestamps
        const allTimestampsSet = new Set<number>()
        selectedServers.forEach(s => {
            const records = recordsMap[s.id] || []
            const sortedRecords = [...records].sort((a, b) => a.date - b.date)
            
            for (let i = 0; i < sortedRecords.length; i++) {
                const r = sortedRecords[i]
                const t = r.date > 1000000000000 ? Math.floor(r.date / 1000) : r.date
                
                if (i > 0) {
                    const prevR = sortedRecords[i-1]
                    const prevT = prevR.date > 1000000000000 ? Math.floor(prevR.date / 1000) : prevR.date
                    if (t - prevT > MAX_GAP_SECONDS) {
                        allTimestampsSet.add(prevT + 1)
                    }
                }
                allTimestampsSet.add(t)
            }
        })

        const sortedTimestamps = Array.from(allTimestampsSet).sort((a, b) => a - b)
        const result: uPlot.AlignedData = [sortedTimestamps]

        selectedServers.forEach(s => {
            const records = recordsMap[s.id] || []
            const values: (number | null)[] = new Array(sortedTimestamps.length).fill(null)
            
            // Map records to timestamps
            records.forEach(r => {
                const t = r.date > 1000000000000 ? Math.floor(r.date / 1000) : r.date
                const idx = sortedTimestamps.indexOf(t)
                if (idx !== -1) values[idx] = r.value
            })

            result.push(values)
        })

        return result
    }, [selectedServers, recordsMap])

    const timeRangeProps = useMemo(() => {
        const now = Math.floor(Date.now() / 1000)
        return {
            from: now - Math.floor(selectedRange / 1000),
            to: now
        }
    }, [selectedRange])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <Layout>
            <div className="flex flex-col gap-8 max-w-6xl mx-auto">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-primary">
                        <BarChart3 className="h-6 w-6" />
                        <h1 className="text-2xl font-bold tracking-tight">Comparaison de serveurs</h1>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative group" ref={containerRef}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    placeholder="Rechercher un serveur à ajouter..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value)
                                        setShowSuggestions(true)
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onKeyDown={handleKeyDown}
                                    className="pl-10 h-11"
                                />
                            </div>
                            
                            {showSuggestions && filteredSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {filteredSuggestions.map((s, idx) => (
                                        <button
                                            key={s.id}
                                            onClick={() => addServer(s)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 hover:bg-accent text-left transition-colors",
                                                idx === 0 && "bg-accent/50"
                                            )}
                                        >
                                            {s.last_favicon ? (
                                                <img src={s.last_favicon} className="h-6 w-6 rounded" alt="" />
                                            ) : (
                                                <div className="h-6 w-6 rounded bg-muted" />
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium line-clamp-1">{s.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{s.ip}</span>
                                            </div>
                                            {idx === 0 && (
                                                <div className="ml-auto text-[10px] text-muted-foreground border px-1 rounded uppercase tracking-tighter">Entrée</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <Select
                                value={String(selectedRange)}
                                onValueChange={(v) => setSelectedRange(Number(v))}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Période" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_RANGES.map((r) => (
                                        <SelectItem key={r.value} value={String(r.value)}>
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(selectedInterval)}
                                onValueChange={(v) => setSelectedInterval(Number(v))}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Intervalle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INTERVALS.map((i) => (
                                        <SelectItem key={i.value} value={String(i.value)}>
                                            {i.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {selectedServers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {selectedServers.map(s => (
                                <div key={s.id} className="flex items-center gap-2 bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm border shadow-sm">
                                    {s.last_favicon && <img src={s.last_favicon} className="h-4 w-4 rounded-sm" alt="" />}
                                    <span className="font-medium">{s.name}</span>
                                    <button 
                                        onClick={() => removeServer(s.id)}
                                        className="hover:text-destructive transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 relative min-h-[500px]">
                    {loadingRecords && selectedServers.length > 0 && (
                        <div className="absolute inset-0 z-10 flex justify-center items-center bg-background/40 backdrop-blur-[1px] rounded-xl transition-all duration-300">
                            <div className="bg-card border shadow-lg px-4 py-2 rounded-full flex items-center gap-2">
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                                <span className="text-xs font-medium ml-1">Mise à jour...</span>
                            </div>
                        </div>
                    )}
                    
                    {selectedServers.length > 0 && (
                        <MultiServerChart 
                            data={chartData} 
                            serverNames={selectedServers.map(s => s.name)} 
                            timeRange={timeRangeProps} 
                        />
                    )}

                    {!loadingRecords && selectedServers.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/30 gap-4">
                            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                            <div className="text-center">
                                <p className="text-muted-foreground font-medium">Aucun serveur sélectionné</p>
                                <p className="text-xs text-muted-foreground/70">Utilisez la recherche ci-dessus pour comparer plusieurs serveurs.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
