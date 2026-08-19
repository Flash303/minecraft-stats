import { useState, useEffect, useRef } from "react"
import { useParams } from "react-router"
import { useAuth } from "@clerk/react"
import { fetchRecords, fetchServer } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"
import { getLabyModServerInfo, type LabyModServer } from "@/core/lib/labymod"
import { getLunarServerInfo, type LunarServer } from "@/core/lib/lunar"

export type DateRange = {
    from: Date | undefined
    to?: Date | undefined
}

export function useServerData(initialServer: Server | null, initialRecords: any[], initialFrom: number) {
    const { id } = useParams<{ id: string }>()
    const { getToken, isSignedIn, isLoaded } = useAuth()

    const [server, setServer] = useState<Server | null>(initialServer || null)
    const [loading, setLoading] = useState(initialServer ? false : true)
    const [loadingRecords, setLoadingRecords] = useState(
        initialRecords && initialRecords.length > 0 ? false : true
    )
    const [isRateLimited, setIsRateLimited] = useState(false)
    const [refreshCount, setRefreshCount] = useState(0)
    const lastFetchParams = useRef<{
        id?: string
        range?: number
        interval?: number
        customFrom?: number
        customTo?: number
        isLoaded?: boolean
        refreshCount?: number
    }>({ refreshCount: 0 })

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [appliedRange, setAppliedRange] = useState(86400000)
    const [appliedInterval, setAppliedInterval] = useState(60000)
    const [customRange, setCustomRange] = useState<DateRange | undefined>()
    const [appliedCustomRange, setAppliedCustomRange] = useState<DateRange | undefined>()
    
    const [timeLimits, setTimeLimits] = useState<{ from: number; to: number }>({ from: 0, to: 0 })
    const [visibleRange, setVisibleRange] = useState<{ min: number; max: number } | null>(null)
    const [rawRecords, setRawRecords] = useState<{ date: number; value: number }[]>(initialRecords || [])
    const [loadedFrom, setLoadedFrom] = useState<number>(initialFrom || Infinity)
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])
    
    const [labyServerInfo, setLabyServerInfo] = useState<LabyModServer | undefined>()
    const [labyManifest, setLabyManifest] = useState<any | undefined>()
    const [lunarServerInfo, setLunarServerInfo] = useState<LunarServer | undefined>()

    const labyBackground = labyServerInfo?.attachments?.find(
        (a) => a.file_name === "background.webp" || a.file_name === "background.png"
    )?.url
    const lunarBackground = lunarServerInfo?.images?.background
    const backgroundUrl = labyBackground || lunarBackground

    useEffect(() => {
        setLabyServerInfo(undefined)
        setLabyManifest(undefined)
        setLunarServerInfo(undefined)

        if (server?.ip) {
            getLabyModServerInfo(server.ip).then((info) => {
                if (info) {
                    setLabyServerInfo(info)
                    const manifestAttachment = info.attachments?.find((a) => a.file_name === 'manifest.json')
                    if (manifestAttachment) {
                        const proxyUrl = `/api/labymod/manifest?url=${encodeURIComponent(manifestAttachment.url)}`
                        fetch(proxyUrl)
                            .then(res => res.json())
                            .then(data => setLabyManifest(data))
                            .catch(console.error)
                    }
                }
            })
            getLunarServerInfo(server.ip).then((info) => {
                if (info) {
                    setLunarServerInfo(info)
                }
            })
        }
    }, [server?.ip])

    useEffect(() => {
        setServer(initialServer)
        setRawRecords(initialRecords || [])
        setLoadedFrom(initialFrom || Infinity)
        setRecords([])
        setLoading(initialServer ? false : true)
    }, [id, initialServer, initialRecords, initialFrom])

    const isChartZoomed = useRef(false)

    useEffect(() => {
        if (!id) return

        const currentParams = {
            id,
            range: selectedRange,
            interval: selectedInterval,
            customFrom: customRange?.from?.getTime(),
            customTo: customRange?.to?.getTime(),
            isLoaded,
            refreshCount,
            serverId: server?.id,
            hasNoRecords: rawRecords.length === 0,
            loadedFrom
        }

        const paramsChanged = JSON.stringify(lastFetchParams.current) !== JSON.stringify(currentParams)
        if (!paramsChanged) return

        const prevParams = lastFetchParams.current
        lastFetchParams.current = currentParams

        let now = 0
        let from = 0

        if (selectedRange === -1) {
            if (!customRange?.from || !customRange?.to) return
            from = Math.floor(customRange.from.getTime() / 1000)
            now = Math.floor(customRange.to.getTime() / 1000) + 86399
        } else {
            now = Math.floor(Date.now() / 1000)
            from = now - Math.floor(selectedRange / 1000)
        }

        const isRefresh = prevParams.refreshCount !== currentParams.refreshCount
        const clerkJustLoaded = prevParams.isLoaded === false && currentParams.isLoaded === true
        const isBackground = isRefresh || clerkJustLoaded

        if (!server || server.id !== Number(id) || isRefresh || clerkJustLoaded) {
            const fetchSrv = async () => {
                if (!isBackground && !server) setLoading(true)
                try {
                    const token = isLoaded && isSignedIn ? await getToken() : undefined
                    const data = await fetchServer(Number(id), token ?? undefined)
                    if (data) setServer(data)
                } catch {
                } finally {
                    if (!isBackground && !server) setLoading(false)
                }
            }
            fetchSrv()
        }

        if (from < loadedFrom || rawRecords.length === 0 || isRefresh || clerkJustLoaded) {
            const fetchRec = async () => {
                if (!isBackground) setLoadingRecords(true)
                try {
                    const token = isLoaded && isSignedIn ? await getToken() : undefined
                    const data = await fetchRecords(Number(id), from, undefined, token ?? undefined)

                    if (isBackground && isChartZoomed.current) {
                        return
                    }

                    setIsRateLimited(false)
                    setRawRecords(data)
                    setLoadedFrom(from)
                    setTimeLimits((prev) => prev.from === from && prev.to === now ? prev : { from, to: now })
                } catch (error: any) {
                    if (error.message === "RATE_LIMIT") {
                        setIsRateLimited(true)
                    }
                    if (rawRecords.length === 0 && !(isBackground && isChartZoomed.current)) {
                        setRawRecords([])
                    }
                } finally {
                    if (!isBackground) setLoadingRecords(false)
                }
            }
            fetchRec()
        } else {
            setTimeLimits((prev) => prev.from === from && prev.to === now ? prev : { from, to: now })
        }
    }, [id, selectedRange, selectedInterval, customRange, isLoaded, isSignedIn, getToken, server, loadedFrom, rawRecords.length, refreshCount])

    useEffect(() => {
        if (rawRecords.length === 0) {
            setRecords([])
            setAppliedRange(selectedRange)
            setAppliedInterval(selectedInterval)
            setAppliedCustomRange(customRange)
            return
        }

        if (selectedRange === -1 && (!customRange?.from || !customRange?.to)) {
            return
        }

        const timer = setTimeout(() => {
            let now = 0
            let from = 0

            if (selectedRange === -1 && customRange?.from && customRange?.to) {
                from = Math.floor(customRange.from.getTime() / 1000)
                now = Math.floor(customRange.to.getTime() / 1000) + 86399
            } else {
                now = Math.floor(Date.now() / 1000)
                from = now - Math.floor(selectedRange / 1000)
            }

            const filtered = rawRecords.filter((r) => r.date >= from && r.date <= now)

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

                const newRecords = Object.keys(buckets)
                    .map((k) => {
                        const bucketTime = Number(k)
                        const b = buckets[bucketTime]
                        return { date: bucketTime, value: Math.round(b.sum / b.count) }
                    })
                    .sort((a, b) => a.date - b.date)

                setRecords(newRecords)
            } else {
                setRecords(filtered)
            }

            setAppliedRange(selectedRange)
            setAppliedInterval(selectedInterval)
            setAppliedCustomRange(customRange)
        }, 10)

        return () => clearTimeout(timer)
    }, [rawRecords, selectedRange, selectedInterval, customRange])

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible" && !isChartZoomed.current) {
                setRefreshCount((c) => c + 1)
            }
        }
        window.addEventListener("visibilitychange", handleVisibilityChange)
        window.addEventListener("focus", handleVisibilityChange)
        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange)
            window.removeEventListener("focus", handleVisibilityChange)
        }
    }, [])

    return {
        server, loading, loadingRecords, records, rawRecords,
        selectedRange, setSelectedRange,
        selectedInterval, setSelectedInterval,
        customRange, setCustomRange,
        appliedRange, appliedInterval, appliedCustomRange,
        timeLimits, visibleRange, setVisibleRange,
        isChartZoomed,
        labyServerInfo, labyManifest, lunarServerInfo,
        backgroundUrl, labyBackground,
        isRateLimited
    }
}
