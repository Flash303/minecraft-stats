import { useState, useMemo, useRef, lazy, Suspense } from "react"
import { fetchRecords } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"
import { useQueryClient, useQueries } from "@tanstack/react-query"

import { prepareMultiChartData, getTimeRanges, getIntervals } from "@/core/lib/chartUtils"
import { BarChart3 } from "lucide-react"
const MultiServerChart = lazy(() => import("./MultiServerChart").then(m => ({ default: m.MultiServerChart })))
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { SearchBar } from "@/ui/layout/SearchBar"
import { TimeIntervalSelector } from "@/pages/server-detail/components/TimeIntervalSelector"
import { SelectedServersTags } from "@/pages/compare/components/SelectedServersTags"
import type { DateRange } from "react-day-picker"

export default function ServerComparison() {
    const { t } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const queryClient = useQueryClient()
    const [selectedServers, setSelectedServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [customRange, setCustomRange] = useState<DateRange | undefined>()

    // Fenêtre temporelle courante (remplace le calcul dupliqué de l'ancien effet)
    const { from, to: now } = useMemo((): { from: number; to: number } => {
        if (selectedRange === -1) {
            if (!customRange?.from || !customRange?.to) return { from: 0, to: 0 }
            return {
                from: Math.floor(customRange.from.getTime() / 1000),
                to: Math.floor(customRange.to.getTime() / 1000) + 86399,
            }
        }
        const nowSec = Math.floor(Date.now() / 1000)
        return { from: nowSec - Math.floor(selectedRange / 1000), to: nowSec }
    }, [selectedRange, customRange])

    const timeRangeProps = useMemo(() => ({ from, to: now }), [from, now])
    const rangeReady = selectedRange !== -1 || (!!customRange?.from && !!customRange?.to)
    const rangeKey = selectedRange === -1
        ? `${Math.floor((customRange?.from?.getTime() ?? 0) / 60000)}-${Math.floor((customRange?.to?.getTime() ?? 0) / 60000)}`
        : String(selectedRange)

    // Une query PAR serveur : l'ajout d'un serveur ne refetch que lui-même,
    // et le cache survit aux retraits. refetchOnWindowFocus remplace les
    // listeners visibilitychange/focus et la garde anti-stale maison.
    const recordQueries = useQueries({
        queries: selectedServers.map((server) => ({
            queryKey: ["compare-record", server.id, selectedInterval, rangeKey],
            queryFn: async () => {
                const token = isLoaded && isSignedIn ? await getToken() : undefined
                return fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            },
            enabled: isLoaded && rangeReady && from > 0,
        })),
    })

    const recordsMap = useMemo(() => {
        const map: { [serverId: number]: { date: number; value: number }[] } = {}
        recordQueries.forEach((q, i) => {
            const server = selectedServers[i]
            if (server && q.data) map[server.id] = q.data
        })
        return map
    }, [recordQueries, selectedServers])

    const loadingRecords = recordQueries.some(q => q.isFetching)

    const removeServer = (serverId: number) => {
        setSelectedServers(prev => prev.filter(s => s.id !== serverId))
        queryClient.removeQueries({ queryKey: ["compare-record", serverId] })
    }

    const addServer = (server: Server) => {
        if (selectedServers.find(s => s.id === server.id)) return
        setSelectedServers(prev => {
            const next = [...prev, server]
            return next.sort((a, b) => (b.last_connected ?? 0) - (a.last_connected ?? 0))
        })
        setSearchQuery("")
    }

    const isChartZoomed = useRef(false)

    const chartData = useMemo(() => prepareMultiChartData(selectedServers, recordsMap, selectedInterval), [selectedServers, recordsMap, selectedInterval])
    const serverNames = useMemo(() => selectedServers.map(s => s.name), [selectedServers])

    return (
        <>
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                        <div className="flex items-center gap-2 text-info">
                            <BarChart3 className="h-6 w-6 shrink-0" />
                            <h1 className="text-2xl font-extrabold tracking-tight text-foreground truncate">{t("comparison.title")}</h1>
                        </div>
                    </div>

                    <div className="max-w-2xl">
                        <SearchBar 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            onSelect={addServer}
                            placeholder={t("comparison.placeholder")}
                            className="h-10"
                        />
                    </div>
 
                    <SelectedServersTags 
                        selectedServers={selectedServers}
                        removeServer={removeServer}
                    />
                </div>
 
                <div className="relative flex w-full">
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
                        <Suspense fallback={<div className="w-full min-h-[520px] flex flex-col items-center justify-center rounded-xl bg-muted/10 gap-4">{t("comparison.loadingData")}</div>}>
                            <MultiServerChart 
                                data={chartData} 
                                serverNames={serverNames} 
                                timeRange={timeRangeProps} 
                                zoomResetId={`${selectedRange}-${selectedInterval}-${customRange?.from?.getTime()}-${customRange?.to?.getTime()}`}
                                onZoomChange={(z) => isChartZoomed.current = z}
                                timeSelector={
                                    <TimeIntervalSelector
                                        selectedRange={selectedRange}
                                        setSelectedRange={setSelectedRange}
                                        selectedInterval={selectedInterval}
                                        setSelectedInterval={setSelectedInterval}
                                        customRange={customRange}
                                        setCustomRange={setCustomRange}
                                        timeRanges={TIME_RANGES}
                                        intervals={INTERVALS}
                                        containerClassName="w-full lg:w-auto"
                                        t={t}
                                    />
                                }
                            />
                        </Suspense>
                    )}
 
                    {!loadingRecords && selectedServers.length === 0 && (
                        <div className="w-full min-h-[520px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/30 gap-4">
                            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                            <div className="text-center">
                                <p className="text-muted-foreground font-medium">{t("comparison.noSelection")}</p>
                                <p className="text-xs text-muted-foreground/70">{t("comparison.noSelectionDesc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
