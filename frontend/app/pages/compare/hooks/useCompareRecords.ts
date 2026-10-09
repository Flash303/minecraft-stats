import { useState, useMemo, useRef } from "react"
import { useQueryClient, useQueries } from "@tanstack/react-query"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { fetchRecords } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"
import { prepareMultiChartData, getTimeRanges, getIntervals } from "@/core/lib/chartUtils"
import type { DateRange } from "react-day-picker"
import type uPlot from "uplot"

export interface CompareTimeRange {
    from: number
    to: number
}

export interface UseCompareRecordsResult {
    selectedServers: Server[]
    searchQuery: string
    setSearchQuery: (value: string) => void
    addServer: (server: Server) => void
    removeServer: (serverId: number) => void
    selectedRange: number
    setSelectedRange: (value: number) => void
    selectedInterval: number
    setSelectedInterval: (value: number) => void
    customRange: DateRange | undefined
    setCustomRange: (value: DateRange | undefined) => void
    timeRanges: Array<{ value: number; label: string }>
    intervals: Array<{ value: number; label: string }>
    chartData: uPlot.AlignedData
    serverNames: string[]
    timeRange: CompareTimeRange
    loadingRecords: boolean
    zoomResetId: string
    isChartZoomedRef: React.MutableRefObject<boolean>
}

/** All data plumbing of the compare page: selection, per-server record queries, windowing. */
export function useCompareRecords(): UseCompareRecordsResult {
    const { t } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const queryClient = useQueryClient()
    const [selectedServers, setSelectedServers] = useState<Server[]>([])
    const [searchQuery, setSearchQuery] = useState("")

    const timeRanges = useMemo(() => getTimeRanges(t), [t])
    const intervals = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [customRange, setCustomRange] = useState<DateRange | undefined>()

    const requestedWindow = useMemo((): CompareTimeRange => {
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

    // One query per server: adding a server only fetches that one, and the
    // cache survives removals. refetchOnWindowFocus covers background refresh.
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

    // Fetch in progress or query not started yet (Clerk still loading): don't
    // show "no data" until a request has actually run.
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

    const isChartZoomedRef = useRef(false)

    const serverNames = useMemo(() => selectedServers.map(s => s.name), [selectedServers])

    // Keep visualized records strictly inside the requested window (same as
    // the server-detail page): out-of-window points make uPlot's cursor snap
    // to a single date while nothing is drawn.
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

    const chartData = useMemo(
        () => prepareMultiChartData(selectedServers, filteredRecordsMap, selectedInterval),
        [selectedServers, filteredRecordsMap, selectedInterval],
    )

    const timeRange = useMemo(() => ({ from, to: requestedWindow.to }), [from, requestedWindow.to])

    const zoomResetId = `${selectedRange}-${selectedInterval}-${customRange?.from?.getTime()}-${customRange?.to?.getTime()}`

    return {
        selectedServers,
        searchQuery,
        setSearchQuery,
        addServer,
        removeServer,
        selectedRange,
        setSelectedRange,
        selectedInterval,
        setSelectedInterval,
        customRange,
        setCustomRange,
        timeRanges,
        intervals,
        chartData,
        serverNames,
        timeRange,
        loadingRecords,
        zoomResetId,
        isChartZoomedRef,
    }
}
