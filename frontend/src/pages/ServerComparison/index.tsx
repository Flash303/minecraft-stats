import { useState, useEffect, useCallback, useMemo } from "react"
import { fetchRecords } from "@/lib/api"
import type { Server } from "@/lib/api"
import { Layout } from "@/components/layout"
import { prepareMultiChartData, getTimeRanges, getIntervals } from "@/lib/chartUtils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { X, BarChart3 } from "lucide-react"
import { MultiServerChart } from "./MultiServerChart"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { SearchBar } from "@/components/layout/SearchBar"

export function ServerComparison() {
    const { t } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [selectedServers, setSelectedServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [recordsMap, setRecordsMap] = useState<{ [serverId: number]: { date: number; value: number }[] }>({})
    const [loadingRecords, setLoadingRecords] = useState(false)

    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)

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

    const addServer = (server: Server) => {
        if (selectedServers.find(s => s.id === server.id)) return
        setSelectedServers(prev => [...prev, server])
        setSearchQuery("")
    }

    const removeServer = (serverId: number) => {
        setSelectedServers(prev => prev.filter(s => s.id !== serverId))
        setRecordsMap(prev => {
            const next = { ...prev }
            delete next[serverId]
            return next
        })
    }

    const chartData = useMemo(() => prepareMultiChartData(selectedServers, recordsMap, selectedInterval), [selectedServers, recordsMap, selectedInterval])

    const timeRangeProps = useMemo(() => {
        const now = Math.floor(Date.now() / 1000)
        return {
            from: now - Math.floor(selectedRange / 1000),
            to: now
        }
    }, [selectedRange])

    return (
        <Layout>
            <div className="flex flex-col gap-8 max-w-6xl mx-auto px-2">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                        <BarChart3 className="h-6 w-6" />
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("comparison.title")}</h1>
                    </div>
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SearchBar 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            onSelect={addServer}
                            placeholder={t("comparison.placeholder")}
                            className="h-10"
                        />
 
                        <div className="flex items-center gap-2 w-full">
                            <Select
                                value={String(selectedRange)}
                                onValueChange={(v) => setSelectedRange(Number(v))}
                            >
                                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium text-xs shadow-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_RANGES.map((r) => (
                                        <SelectItem key={r.value} value={String(r.value)} className="text-xs">
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(selectedInterval)}
                                onValueChange={(v) => setSelectedInterval(Number(v))}
                            >
                                <SelectTrigger className="h-10 w-full rounded-xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-medium text-xs shadow-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INTERVALS.map((i) => (
                                        <SelectItem key={i.value} value={String(i.value)} className="text-xs">
                                            {i.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
 
                    {selectedServers.length > 0 && (
                        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
                            {selectedServers.map(s => (
                                <div key={s.id} className="flex items-center gap-2 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3.5 py-1.5 rounded-xl text-xs border border-indigo-500/10 dark:border-indigo-500/20 shadow-xs hover:border-indigo-500/35 transition-colors">
                                    {s.last_favicon && <img src={s.last_favicon} className="h-4.5 w-4.5 rounded-md object-cover shadow-xs" alt="" />}
                                    <span className="font-bold">{s.name}</span>
                                    <button 
                                        onClick={() => removeServer(s.id)}
                                        className="hover:text-rose-500 transition-colors ml-1 cursor-pointer focus:outline-none"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
 
                <div className="flex flex-col gap-4 relative min-h-[340px] sm:min-h-[500px]">
                    {loadingRecords && selectedServers.length > 0 && (
                        <div className="absolute inset-0 z-10 flex justify-center items-center bg-background/40 backdrop-blur-[1px] rounded-xl transition-all duration-300">
                            <div className="bg-card border shadow-lg px-4 py-2 rounded-full flex items-center gap-2">
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <div className="h-2 w-2 bg-primary rounded-full animate-bounce" />
                                <span className="text-xs font-medium ml-1">{t("comparison.updating")}</span>
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
                                <p className="text-muted-foreground font-medium">{t("comparison.noSelection")}</p>
                                <p className="text-xs text-muted-foreground/70">{t("comparison.noSelectionDesc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}
