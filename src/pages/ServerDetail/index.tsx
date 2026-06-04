import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import type { Server } from "@/lib/api"
import { fetchRecords, fetchServer } from "@/lib/api"
import { PlayerChart } from "@/components/ServerDetail/PlayerChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { ArrowLeft, Wifi, WifiOff, Copy, Check } from "lucide-react"
import { Layout } from "@/components/layout"
import { cn } from "@/lib/utils"

const TIME_RANGES = [
    { label: "Dernière heure", value: 3600000 },
    { label: "Dernières 6 heures", value: 21600000 },
    { label: "Dernières 24 heures", value: 86400000 },
    { label: "Derniers 7 jours", value: 604800000 },
    { label: "Derniers 30 jours", value: 2592000000 }
]

const INTERVALS = [
    { label: "10 sec", value: 10000 },
    { label: "1 min", value: 60000 },
    { label: "5 min", value: 300000 },
    { label: "30 min", value: 1800000 },
    { label: "1 heure", value: 3600000 }
]

export function ServerDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const [server, setServer] = useState<Server | null>(null)
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingRecords, setLoadingRecords] = useState(false)
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[2].value)
    const [selectedInterval, setSelectedInterval] = useState(INTERVALS[1].value)
    const [copied, setCopied] = useState(false)

    const loadServer = useCallback(async () => {
        if (!id) return
        setLoading(true)
        try {
            const data = await fetchServer(Number(id))
            setServer(data)
        } catch {
            setServer(null)
        } finally {
            setLoading(false)
        }
    }, [id])

    const loadRecords = useCallback(async () => {
        if (!server) return
        setLoadingRecords(true)
        try {
            const from = Math.floor((Date.now() - selectedRange) / 1000)
            const data = await fetchRecords(server.id, from, selectedInterval)
            setRecords(data)
        } catch {
            setRecords([])
        } finally {
            setLoadingRecords(false)
        }
    }, [server, selectedRange, selectedInterval])

    useEffect(() => {
        loadServer()
    }, [loadServer])

    useEffect(() => {
        loadRecords()
    }, [loadRecords])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground animate-pulse">Chargement des détails...</p>
            </div>
        )
    }

    if (!server) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive font-semibold">Serveur non trouvé</p>
                <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
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

    const headerLeft = (
        <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex min-w-0 items-center gap-3">
                {server.last_favicon ? (
                    <img
                        src={server.last_favicon}
                        alt=""
                        className="h-8 w-8 rounded shadow-sm"
                    />
                ) : null}
                <div className="flex flex-col min-w-0">
                    <h1 className="font-bold text-base leading-none mb-1 line-clamp-1">
                        {server.name}
                    </h1>
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        )}>
                            {isOnline ? <Wifi className="h-2.5 w-2.5" /> : <WifiOff className="h-2.5 w-2.5" />}
                            {isOnline ? "En ligne" : "Hors ligne"}
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
                    </div>
                </div>
            </div>
        </div>
    )

    const headerRight = (
        <div className="flex items-center gap-2">
            <Select
                value={String(selectedRange)}
                onValueChange={(v: string) =>
                    setSelectedRange(Number(v))
                }
            >
                <SelectTrigger className="h-8 w-[160px] hidden md:flex text-xs">
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
                <SelectTrigger className="h-8 w-[100px] hidden md:flex text-xs">
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
    )

    return (
        <Layout leftContent={headerLeft} rightContent={headerRight}>
            <div className="grid gap-6">
                <Card className="overflow-hidden border-none shadow-md bg-card">
                    <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20 py-4">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                            Historique des joueurs
                            {isOnline && (
                                <span className="text-xs font-normal text-muted-foreground">
                                    ({new Intl.NumberFormat("fr-FR").format(server.last_connected ?? 0)} joueurs actuels)
                                </span>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loadingRecords ? (
                            <div className="py-24 flex justify-center items-center">
                                <p className="text-muted-foreground text-sm animate-pulse">Chargement du graphique...</p>
                            </div>
                        ) : (
                            <div className="p-4">
                                <PlayerChart
                                    data={records}
                                    serverName={server.name}
                                    interval={selectedInterval}
                                    timeRange={{
                                        from: Math.floor(
                                            (Date.now() - selectedRange) / 1000
                                        ),
                                        to: Math.floor(Date.now() / 1000)
                                    }}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    )
}
