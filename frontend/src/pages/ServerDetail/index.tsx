import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import type { Server } from "@/lib/api"
import { fetchRecords, fetchServer } from "@/lib/api"
import { PlayerChart } from "@/components/ServerDetail/PlayerChart"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { ArrowLeft, Wifi, WifiOff, Copy, Check, BarChart, Users, TrendingUp, TrendingDown } from "lucide-react"
import { Layout } from "@/components/layout"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"

export function ServerDetail() {
    const { t, language } = useLanguage()
    const { id } = useParams<{ id: string }>()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [server, setServer] = useState<Server | null>(null)
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [copied, setCopied] = useState(false)

    const TIME_RANGES = useMemo(() => [
        { label: t("serverDetail.lastHour"), value: 3600000 },
        { label: t("serverDetail.last6Hours"), value: 21600000 },
        { label: t("serverDetail.last24Hours"), value: 86400000 },
        { label: t("serverDetail.last7Days"), value: 604800000 },
        { label: t("serverDetail.last30Days"), value: 2592000000 }
    ], [t])

    const INTERVALS = useMemo(() => [
        { label: t("serverDetail.interval10s"), value: 10000 },
        { label: t("serverDetail.interval1m"), value: 60000 },
        { label: t("serverDetail.interval5m"), value: 300000 },
        { label: t("serverDetail.interval30m"), value: 1800000 },
        { label: t("serverDetail.interval1h"), value: 3600000 }
    ], [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)

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
        setLoadingRecords(true)
        try {
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            const from = Math.floor((Date.now() - selectedRange) / 1000)
            const data = await fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            setRecords(data)
        } catch {
            setRecords([])
        } finally {
            setLoadingRecords(false)
        }
    }, [server, selectedRange, selectedInterval, getToken, isSignedIn, isLoaded])

    useEffect(() => {
        if (!isLoaded) return
        loadServer()
    }, [loadServer, isLoaded])

    useEffect(() => {
        if (!isLoaded) return
        loadRecords()
    }, [loadRecords, isLoaded])

    const timeLimits = useMemo(() => {
        const now = Math.floor(Date.now() / 1000)
        return {
            from: now - Math.floor(selectedRange / 1000),
            to: now
        }
    }, [selectedRange])

    const stats = useMemo(() => {
        if (records.length === 0) return null
        const values = records.map(r => r.value)
        const max = Math.max(...values)
        const min = Math.min(...values)
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length)
        return { max, min, avg }
    }, [records])

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
    const displayIp = server.port === 25565 ? server.ip : `${server.ip}:${server.port}`
    const fullIp = `${server.ip}:${server.port}`

    const handleCopy = () => {
        navigator.clipboard.writeText(fullIp)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const locale = language === "fr" ? "fr-FR" : "en-US"

    return (
        <Layout>
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
                    <div className="flex items-center gap-3">
                        <Link to="/">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex min-w-0 items-center gap-3">
                            {server.last_favicon ? (
                                <img
                                    src={server.last_favicon}
                                    alt=""
                                    className="h-10 w-10 rounded shadow-sm"
                                />
                            ) : null}
                            <div className="flex flex-col min-w-0">
                                <h1 className="font-bold text-xl leading-none mb-1 line-clamp-1">
                                    {server.name}
                                </h1>
                                <div className="flex items-center gap-2">
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                        isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}>
                                        {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                        {isOnline ? t("common.online") : t("common.offline")}
                                    </div>
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-1 text-muted-foreground text-[10px] font-mono hover:text-primary transition-colors group/copy"
                                    >
                                        <span>{displayIp}</span>
                                        {copied ? (
                                            <Check className="h-2.5 w-2.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                                        )}
                                    </button>
                                    {server.last_version && (
                                        <Badge variant="secondary" className="font-mono text-[10px] ml-1">
                                            v{server.last_version}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <Select
                                value={String(selectedRange)}
                                onValueChange={(v: string) =>
                                    setSelectedRange(Number(v))
                                }
                            >
                                <SelectTrigger className="h-9 w-[160px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIME_RANGES.map((r) => (
                                        <SelectItem
                                            key={r.value}
                                            value={String(r.value)}
                                            className="text-xs"
                                        >
                                            {r.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={String(selectedInterval)}
                                onValueChange={(v: string) =>
                                    setSelectedInterval(Number(v))
                                }
                            >
                                <SelectTrigger className="h-9 w-[100px] text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {INTERVALS.map((i) => (
                                        <SelectItem
                                            key={i.value}
                                            value={String(i.value)}
                                            className="text-xs"
                                        >
                                            {i.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart className="h-5 w-5 text-primary" />
                        {t("serverDetail.playerHistory")}
                        {isOnline && (
                            <span className="text-sm font-normal text-muted-foreground">
                                ({new Intl.NumberFormat(locale).format(server.last_connected ?? 0)} {t("common.currentPlayers")})
                            </span>
                        )}
                    </h2>
                    
                    <div className="bg-card rounded-xl border p-4 shadow-sm min-h-[500px] flex items-center justify-center relative">
                        {loadingRecords ? (
                            <p className="text-muted-foreground text-sm animate-pulse">{t("serverDetail.chartLoading")}</p>
                        ) : (
                            <PlayerChart
                                data={records}
                                serverName={server.name}
                                interval={selectedInterval}
                                timeRange={timeLimits}
                            />
                        )}
                    </div>
                </div>

                {stats && (
                    <div className="flex flex-col gap-4">
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            {t("common.stats.title")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col gap-1">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.average")}</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold">{new Intl.NumberFormat(locale).format(stats.avg)}</span>
                                    <TrendingUp className="h-5 w-5 text-blue-500 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col gap-1 text-green-600 dark:text-green-400">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.max")}</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold">{new Intl.NumberFormat(locale).format(stats.max)}</span>
                                    <TrendingUp className="h-5 w-5 opacity-50" />
                                </div>
                            </div>
                            <div className="bg-muted/30 border rounded-lg p-4 flex flex-col gap-1 text-red-600 dark:text-red-400">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.min")}</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-2xl font-bold">{new Intl.NumberFormat(locale).format(stats.min)}</span>
                                    <TrendingDown className="h-5 w-5 opacity-50" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
