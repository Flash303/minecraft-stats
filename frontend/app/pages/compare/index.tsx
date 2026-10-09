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
import type { MetaFunction } from "react-router"
import { translate } from "@/core/lib/i18n"
import { resolveMetaLanguage, siteTitle, staticPageMeta } from "@/core/lib/seo-meta"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    const title = siteTitle(lang, "comparison.title")
    const description = translate(lang, "comparison.noSelectionDesc")
    return staticPageMeta({ title, description, path: "/compare" })
}

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

    // Fenêtre temporelle demandée (relative "dernières X" ou plage personnalisée).
    const requestedWindow = useMemo((): { from: number; to: number } => {
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

    const from = requestedWindow.from
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

    // Fetch en cours OU query pas encore déclenchée (Clerk en cours de chargement) :
    // évite d'afficher "aucune donnée" tant que la requête n'a pas réellement tourné.
    const loadingRecords =
        selectedServers.length > 0 &&
        rangeReady &&
        from > 0 &&
        recordQueries.some(q => q.isFetching || q.isPending)

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

    const serverNames = useMemo(() => selectedServers.map(s => s.name), [selectedServers])

    // Aligne les records sur la fenêtre demandée (comme ServerDetails filtre sur
    // [from, now]) : sans cela des points hors fenêtre restent dans les données
    // et le curseur uPlot s'y accroche (une seule date au survol, aucun point tracé).
    const filteredRecordsMap = useMemo(() => {
        if (from <= 0 || requestedWindow.to <= 0) return recordsMap
        const map: { [serverId: number]: { date: number; value: number }[] } = {}
        Object.entries(recordsMap).forEach(([id, rows]) => {
            const sid = Number(id)
            map[sid] = rows.filter(r => {
                const d = r.date > 1000000000000 ? Math.floor(r.date / 1000) : r.date
                return d >= from && d <= requestedWindow.to
            })
        })
        return map
    }, [recordsMap, from, requestedWindow.to])

    const chartData = useMemo(() => prepareMultiChartData(selectedServers, filteredRecordsMap, selectedInterval), [selectedServers, filteredRecordsMap, selectedInterval])

    const timeRangeProps = useMemo(() => ({ from, to: requestedWindow.to }), [from, requestedWindow.to])

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
                    {selectedServers.length > 0 && (
                        <Suspense fallback={<div className="min-h-[420px] w-full animate-pulse rounded-xl bg-muted/10 sm:min-h-[520px]" />}>
                            <MultiServerChart 
                                data={chartData} 
                                serverNames={serverNames} 
                                timeRange={timeRangeProps} 
                                zoomResetId={`${selectedRange}-${selectedInterval}-${customRange?.from?.getTime()}-${customRange?.to?.getTime()}`}
                                onZoomChange={(z) => isChartZoomed.current = z}
                                isLoading={loadingRecords}
                                overlay={
                                    loadingRecords && (
                                        <div className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-[2px] transition-all duration-200">
                                            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                                            <p className="text-muted-foreground animate-pulse text-sm font-medium">
                                                {t("serverDetail.chartLoading")}
                                            </p>
                                        </div>
                                    )
                                }
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
