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
import { ArrowLeft, Wifi, WifiOff, Copy, Check, BarChart, Users, TrendingUp, TrendingDown, User as UserIcon } from "lucide-react"
import { Layout } from "@/components/layout"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { getTimeRanges, getIntervals } from "@/lib/chartUtils"

export function ServerDetail() {
    const { t, language } = useLanguage()
    const { id } = useParams<{ id: string }>()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [server, setServer] = useState<Server | null>(null)
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [copied, setCopied] = useState(false)

    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])

    const [selectedRange, setSelectedRange] = useState(86400000)
    const [selectedInterval, setSelectedInterval] = useState(60000)
    const [timeLimits, setTimeLimits] = useState<{ from: number; to: number }>({ from: 0, to: 0 })
 
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
            const now = Math.floor(Date.now() / 1000)
            const from = now - Math.floor(selectedRange / 1000)
            const data = await fetchRecords(server.id, from, selectedInterval, token ?? undefined)
            setRecords(data)
            setTimeLimits({ from, to: now })
        } catch {
            setRecords([])
        } finally {
            setLoadingRecords(false)
        }
    }, [server, selectedRange, selectedInterval, getToken, isSignedIn, isLoaded])
 
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/">
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex min-w-0 items-center gap-3">
                            {server.last_favicon ? (
                                <img
                                    src={server.last_favicon}
                                    alt=""
                                    className="h-10 w-10 rounded shadow-sm flex-shrink-0"
                                />
                            ) : null}
                            <div className="flex flex-col min-w-0">
                                <h1 className="font-bold text-xl leading-none mb-1 line-clamp-1">
                                    {server.name}
                                </h1>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className={cn(
                                        "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                                        isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                    )}>
                                        {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                                        {isOnline ? t("common.online") : t("common.offline")}
                                    </div>
                                    <button 
                                        onClick={handleCopy}
                                        className="flex items-center gap-1 text-muted-foreground text-[10px] font-mono hover:text-primary transition-colors group/copy max-w-[130px] sm:max-w-none"
                                    >
                                        <span className="truncate">{displayIp}</span>
                                        {copied ? (
                                            <Check className="h-2.5 w-2.5 text-emerald-500 flex-shrink-0" />
                                        ) : (
                                            <Copy className="h-2.5 w-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
                                        )}
                                    </button>
                                    {server.last_version && (
                                        <Badge variant="secondary" className="font-mono text-[10px] whitespace-nowrap">
                                            v{server.last_version}
                                        </Badge>
                                    )}
                                    {server.user && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] bg-secondary/50 px-2 py-0.5 rounded-full border border-border/50">
                                            <span>{t("serverDetail.addedBy")}</span>
                                            {server.user.image_url ? (
                                                <img
                                                    src={server.user.image_url}
                                                    alt={server.user.username || "User"}
                                                    className="h-3.5 w-3.5 rounded-full object-cover"
                                                />
                                            ) : (
                                                <UserIcon className="h-3 w-3" />
                                            )}
                                            <span className="font-medium text-foreground">
                                                {server.user.first_name ? (server.user.last_name ? `${server.user.first_name} ${server.user.last_name}` : server.user.first_name) : (server.user.username || server.user.id)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-row items-center gap-2 w-full md:w-auto md:ml-auto">
                        <Select
                            value={String(selectedRange)}
                            onValueChange={(v: string) =>
                                setSelectedRange(Number(v))
                            }
                        >
                            <SelectTrigger className="h-9 w-full md:w-[160px] text-xs">
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
                            <SelectTrigger className="h-9 w-full md:w-[100px] text-xs">
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
                    
                    <div className="bg-card rounded-xl border p-4 shadow-sm min-h-[340px] sm:min-h-[500px] flex items-center justify-center relative">
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
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            {t("common.stats.title")}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.average")}</span>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{new Intl.NumberFormat(locale).format(stats.avg)}</span>
                                    <TrendingUp className="h-5 w-5 text-blue-500/80 opacity-80" />
                                </div>
                            </div>
                            <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 text-emerald-600 dark:text-emerald-450">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.max")}</span>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-3xl font-extrabold">{new Intl.NumberFormat(locale).format(stats.max)}</span>
                                    <TrendingUp className="h-5 w-5 opacity-80" />
                                </div>
                            </div>
                            <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 text-rose-600 dark:text-rose-450">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.min")}</span>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-3xl font-extrabold">{new Intl.NumberFormat(locale).format(stats.min)}</span>
                                    <TrendingDown className="h-5 w-5 opacity-80" />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    )
}
