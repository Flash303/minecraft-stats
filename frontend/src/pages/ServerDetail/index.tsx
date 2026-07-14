import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchRecords, fetchServer } from "@/lib/api"
import type { Server } from "@/lib/api"
import { PlayerChart } from "@/components/ServerDetail/PlayerChart"
import { ServerDetailHeader } from "@/components/ServerDetail/ServerDetailHeader"
import { TimeIntervalSelector } from "@/components/ServerDetail/TimeIntervalSelector"
import { StatsSection } from "@/components/ServerDetail/StatsSection"
import { AlertsSection } from "@/components/ServerDetail/AlertsSection"
import { Button } from "@/components/ui/button"
import { BarChart } from "lucide-react"

import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getTimeRanges, getIntervals } from "@/lib/chartUtils"
import { cn } from "@/lib/utils"

export type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
};

export function ServerDetail() {
    const { t, language } = useLanguage()
    const { id } = useParams<{ id: string }>()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [server, setServer] = useState<Server | null>(null)
    const [loading, setLoading] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)

    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [appliedRange, setAppliedRange] = useState(86400000)
    const [appliedInterval, setAppliedInterval] = useState(60000)
    const [customRange, setCustomRange] = useState<DateRange | undefined>()
    const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange | undefined>()
    const [timeLimits, setTimeLimits] = useState<{ from: number; to: number }>({ from: 0, to: 0 })
    const [visibleRange, setVisibleRange] = useState<{ min: number; max: number } | null>(null)
    const [rawRecords, setRawRecords] = useState<{ date: number; value: number }[]>([])
    const [loadedFrom, setLoadedFrom] = useState<number>(Infinity)
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])

    useEffect(() => {
        setLoading(true)
        setServer(null)
        setRawRecords([])
        setRecords([])
        setLoadedFrom(Infinity)
    }, [id])
 
    const loadServer = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const data = await fetchServer(Number(id), token ?? undefined)
            setServer(data)
        } catch {
            setServer(null)
        } finally {
            setLoading(false)
        }
    }, [id, getToken, isSignedIn, isLoaded])
 
    const loadRecords = useCallback(async () => {
        if (!server) return
        
        let now = 0;
        let from = 0;
        
        if (selectedRange === -1) {
            if (!customRange?.from || !customRange?.to) return;
            from = Math.floor(customRange.from.getTime() / 1000);
            now = Math.floor(customRange.to.getTime() / 1000) + 86399; // Include the entire end day
        } else {
            now = Math.floor(Date.now() / 1000);
            from = now - Math.floor(selectedRange / 1000);
        }
        
        if (from >= loadedFrom && rawRecords.length > 0) {
            setTimeLimits({ from, to: now })
            return
        }

        setLoadingRecords(true)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            // Fetch raw records without bucketing from API
            const data = await fetchRecords(server.id, from, undefined, token ?? undefined)
            setRawRecords(data)
            setLoadedFrom(from)
            setTimeLimits({ from, to: now })
        } catch {
            if (rawRecords.length === 0) setRawRecords([])
        } finally {
            setLoadingRecords(false)
        }
    }, [server, selectedRange, customRange, getToken, isSignedIn, isLoaded, loadedFrom, rawRecords.length])

    useEffect(() => {
        if (rawRecords.length === 0) {
            setRecords([])
            setAppliedRange(selectedRange)
            setAppliedInterval(selectedInterval)
            setAppliedCustomRange(customRange)
            return
        }
        
        // Wait until both dates are selected
        if (selectedRange === -1 && (!customRange?.from || !customRange?.to)) {
            return;
        }
        
        const timer = setTimeout(() => {
            let now = 0;
            let from = 0;
            
            if (selectedRange === -1 && customRange?.from && customRange?.to) {
                from = Math.floor(customRange.from.getTime() / 1000);
                now = Math.floor(customRange.to.getTime() / 1000) + 86399;
            } else {
                now = Math.floor(Date.now() / 1000);
                from = now - Math.floor(selectedRange / 1000);
            }
            
            // Filter raw records within selected range
            const filtered = rawRecords.filter(r => r.date >= from && r.date <= now)
            
            if (selectedInterval && selectedInterval > 0) {
                const intervalSec = selectedInterval / 1000
                const buckets: { [bucketTime: number]: { sum: number; count: number } } = {}

                for (let i = 0; i < filtered.length; i++) {
                    const r = filtered[i]
                    const bucketTime = Math.floor(r.date / intervalSec) * intervalSec
                    if (!buckets[bucketTime]) {
                        buckets[bucketTime] = { sum: 0, count: 0 }
                    }
                    buckets[bucketTime].sum += r.value
                    buckets[bucketTime].count += 1
                }

                const newRecords = Object.keys(buckets).map(k => {
                    const bucketTime = Number(k)
                    const b = buckets[bucketTime]
                    return {
                        date: bucketTime,
                        value: Math.round(b.sum / b.count)
                    }
                }).sort((a, b) => a.date - b.date)
                
                setRecords(newRecords)
            } else {
                setRecords(filtered)
            }
            
            setAppliedRange(selectedRange)
            setAppliedInterval(selectedInterval)
            setAppliedCustomRange(customRange)
        }, 10) // small delay to ensure UI paints
        
        return () => clearTimeout(timer)
    }, [rawRecords, selectedRange, selectedInterval, customRange])
 
    useEffect(() => {
        if (!isLoaded) return
        Promise.resolve().then(() => {
            loadServer()
        })
    }, [loadServer, isLoaded])
 
    useEffect(() => {
        if (!isLoaded) return
        Promise.resolve().then(() => {
            loadRecords()
        })
    }, [loadRecords, isLoaded])

    const stats = useMemo(() => {
        if (records.length === 0) return null
        let max = -Infinity
        let min = Infinity
        let sum = 0
        let count = 0
        
        const minTime = visibleRange ? visibleRange.min : 0
        const maxTime = visibleRange ? visibleRange.max : Infinity
        
        for (let i = 0; i < records.length; i++) {
            const r = records[i]
            const t = r.date > 1000000000000 ? r.date / 1000 : r.date
            
            if (t >= minTime && t <= maxTime) {
                const val = r.value
                if (val > max) max = val
                if (val < min) min = val
                sum += val
                count++
            }
        }
        
        if (count === 0) return null
        const avg = Math.round(sum / count)
        return { max, min, avg }
    }, [records, visibleRange])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground animate-pulse">{t("serverDetail.loading")}</p>
            </div>
        )
    }

    if (!server) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive font-semibold">{t("serverDetail.notFound")}</p>
                <Link to={'/'}>
                    <Button>{t("common.backToHome")}</Button>
                </Link>
            </div>
        )
    }

    const isOnline = server.last_status === "online"
    const locale = language === "fr" ? "fr-FR" : "en-US"

    const isCustomRangeIncomplete = selectedRange === -1 && (!customRange?.from || !customRange?.to);
    const isPending = selectedRange !== appliedRange || selectedInterval !== appliedInterval || (selectedRange === -1 && (customRange?.from?.getTime() !== appliedCustomRange?.from?.getTime() || customRange?.to?.getTime() !== appliedCustomRange?.to?.getTime()));

    return (
        <>
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
                    <ServerDetailHeader server={server} t={t} />

                    <TimeIntervalSelector
                        selectedRange={selectedRange}
                        setSelectedRange={setSelectedRange}
                        selectedInterval={selectedInterval}
                        setSelectedInterval={setSelectedInterval}
                        customRange={customRange}
                        setCustomRange={setCustomRange}
                        timeRanges={TIME_RANGES}
                        intervals={INTERVALS}
                        containerClassName="w-full md:w-auto md:ml-auto"
                        t={t}
                    />
                </div>

                    <div className="relative flex min-h-[340px] w-full items-center justify-center sm:min-h-[500px]">
                        {(loadingRecords || isPending) && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-[2px] transition-all duration-200 rounded-xl">
                                {isCustomRangeIncomplete ? (
                                    <p className="text-muted-foreground font-medium text-sm">{t("serverDetail.selectCustomRange")}</p>
                                ) : (
                                    <>
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                        <p className="text-muted-foreground text-sm animate-pulse font-medium">{t("serverDetail.chartLoading")}</p>
                                    </>
                                )}
                            </div>
                        )}
                        <div className={cn("w-full transition-opacity duration-200", (loadingRecords || isPending) ? "opacity-30 pointer-events-none" : "opacity-100")}>
                            <PlayerChart
                                data={records}
                                serverName={server.name}
                                interval={appliedInterval}
                                timeRange={timeLimits}
                                onVisibleRangeChange={(min, max) => setVisibleRange({ min, max })}
                                header={
                                    <h2 className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-lg font-semibold w-full">
                                        <div className="flex items-center gap-2 truncate">
                                            <BarChart className="text-primary h-5 w-5 shrink-0" />
                                            <span className="truncate">{t("serverDetail.playerHistory")}</span>
                                        </div>
                                        {isOnline && (
                                            <span className="text-muted-foreground text-sm font-normal sm:whitespace-nowrap">
                                                (
                                                {new Intl.NumberFormat(locale).format(
                                                    server.last_connected ?? 0
                                                )}{" "}
                                                {t("common.currentPlayers")})
                                            </span>
                                        )}
                                    </h2>
                                }
                            />
                        </div>
                    </div>

                {stats && <StatsSection stats={stats} locale={locale} t={t} />}

                <AlertsSection serverId={server.id} t={t} />
            </div>
        </>
    )
}
