import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react"
import { fetchRecords } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"

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
    const [selectedServers, setSelectedServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [recordsMap, setRecordsMap] = useState<{ [serverId: number]: { date: number; value: number }[] }>({})
    const [loadingRecords, setLoadingRecords] = useState(false)
    const fetchedServersRef = useRef<Set<number>>(new Set())

    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [customRange, setCustomRange] = useState<DateRange | undefined>()
    const [timeRangeProps, setTimeRangeProps] = useState<{ from: number; to: number }>({ from: 0, to: 0 })
 
    const fetchServerRecords = useCallback(async (server: Server, from: number) => {
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            setRecordsMap(prev => ({ ...prev, [server.id]: data }))
            fetchedServersRef.current.add(server.id)
        } catch (err) {
            console.error(`Failed to load records for server ${server.id}`, err)
        }
    }, [selectedInterval, isLoaded, isSignedIn, getToken])
 
    const isChartZoomed = useRef(false)

    const lastFetchParams = useRef<{ range: number, interval: number, customFrom?: number, customTo?: number }>({
        range: selectedRange,
        interval: selectedInterval,
        customFrom: customRange?.from?.getTime(),
        customTo: customRange?.to?.getTime(),
    })

    useEffect(() => {
        const refreshAll = async (isBackground = false) => {
            if (!isBackground) setLoadingRecords(true)
            // eslint-disable-next-line no-useless-assignment
            let now = 0;
            let from = 0;
            
            if (selectedRange === -1) {
                if (!customRange?.from || !customRange?.to) {
                    if (!isBackground) setLoadingRecords(false);
                    return;
                }
                from = Math.floor(customRange.from.getTime() / 1000);
                now = Math.floor(customRange.to.getTime() / 1000) + 86399;
            } else {
                now = Math.floor(Date.now() / 1000);
                from = now - Math.floor(selectedRange / 1000);
            }
            
            const currentParams = {
                range: selectedRange,
                interval: selectedInterval,
                customFrom: customRange?.from?.getTime(),
                customTo: customRange?.to?.getTime(),
            }
            const paramsChanged = JSON.stringify(lastFetchParams.current) !== JSON.stringify(currentParams)
            if (paramsChanged) {
                fetchedServersRef.current.clear()
            }

            setTimeRangeProps({ from, to: now })
            
            const serversToFetch = isBackground 
                ? selectedServers 
                : selectedServers.filter(s => !fetchedServersRef.current.has(s.id))

            if (serversToFetch.length > 0) {
                await Promise.all(serversToFetch.map(s => fetchServerRecords(s, from)))
            }
            
            lastFetchParams.current = currentParams
            if (!isBackground) setLoadingRecords(false)
        }
        if (selectedServers.length > 0) {
            Promise.resolve().then(() => {
                refreshAll()
            })
        } else {
            Promise.resolve().then(() => {
                setRecordsMap({})
            })
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && selectedServers.length > 0 && !isChartZoomed.current) {
                refreshAll(true)
            }
        }
        window.addEventListener('visibilitychange', handleVisibilityChange)
        window.addEventListener('focus', handleVisibilityChange)
        return () => {
            window.removeEventListener('visibilitychange', handleVisibilityChange)
            window.removeEventListener('focus', handleVisibilityChange)
        }
    }, [selectedServers, selectedRange, selectedInterval, customRange, fetchServerRecords])
 
    const addServer = (server: Server) => {
        if (selectedServers.find(s => s.id === server.id)) return
        setSelectedServers(prev => {
            const next = [...prev, server]
            return next.sort((a, b) => (b.last_connected ?? 0) - (a.last_connected ?? 0))
        })
        setSearchQuery("")
    }
 
    const removeServer = (serverId: number) => {
        setSelectedServers(prev => prev.filter(s => s.id !== serverId))
        fetchedServersRef.current.delete(serverId)
        setRecordsMap(prev => {
            const next = { ...prev }
            delete next[serverId]
            return next
        })
    }
 
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
                        <Suspense fallback={<div className="w-full min-h-[520px] flex flex-col items-center justify-center rounded-xl bg-muted/10 gap-4">Loading chart...</div>}>
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
