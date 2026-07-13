import { useState, useEffect, useCallback, useMemo } from "react"
import { fetchRecords } from "@/lib/api"
import type { Server } from "@/lib/api"

import { prepareMultiChartData, getTimeRanges, getIntervals } from "@/lib/chartUtils"
import { BarChart3 } from "lucide-react"
import { MultiServerChart } from "./MultiServerChart"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { SearchBar } from "@/components/layout/SearchBar"
import { TimeIntervalSelector } from "@/components/ServerDetail/TimeIntervalSelector"
import { SelectedServersTags } from "@/components/ServerComparison/SelectedServersTags"
import type { DateRange } from "react-day-picker"

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
    const [customRange, setCustomRange] = useState<DateRange | undefined>()
    const [timeRangeProps, setTimeRangeProps] = useState<{ from: number; to: number }>({ from: 0, to: 0 })
 
    const fetchServerRecords = useCallback(async (server: Server, from: number) => {
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            setRecordsMap(prev => ({ ...prev, [server.id]: data }))
        } catch (err) {
            console.error(`Failed to load records for server ${server.id}`, err)
        }
    }, [selectedInterval, isLoaded, isSignedIn, getToken])
 
    useEffect(() => {
        const refreshAll = async () => {
            setLoadingRecords(true)
            let now = 0;
            let from = 0;
            
            if (selectedRange === -1) {
                if (!customRange?.from || !customRange?.to) {
                    setLoadingRecords(false);
                    return;
                }
                from = Math.floor(customRange.from.getTime() / 1000);
                now = Math.floor(customRange.to.getTime() / 1000) + 86399;
            } else {
                now = Math.floor(Date.now() / 1000);
                from = now - Math.floor(selectedRange / 1000);
            }
            
            setTimeRangeProps({ from, to: now })
            await Promise.all(selectedServers.map(s => fetchServerRecords(s, from)))
            setLoadingRecords(false)
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
        setRecordsMap(prev => {
            const next = { ...prev }
            delete next[serverId]
            return next
        })
    }
 
    const chartData = useMemo(() => prepareMultiChartData(selectedServers, recordsMap, selectedInterval), [selectedServers, recordsMap, selectedInterval])

    return (
        <>
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <BarChart3 className="h-6 w-6 shrink-0" />
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white truncate">{t("comparison.title")}</h1>
                        </div>
 
                        <TimeIntervalSelector
                            selectedRange={selectedRange}
                            setSelectedRange={setSelectedRange}
                            selectedInterval={selectedInterval}
                            setSelectedInterval={setSelectedInterval}
                            customRange={customRange}
                            setCustomRange={setCustomRange}
                            timeRanges={TIME_RANGES}
                            intervals={INTERVALS}
                            containerClassName="w-full md:justify-end"
                            t={t}
                        />
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
                        <MultiServerChart 
                            data={chartData} 
                            serverNames={selectedServers.map(s => s.name)} 
                            timeRange={timeRangeProps} 
                        />
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
