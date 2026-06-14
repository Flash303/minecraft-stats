import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, Link } from "react-router-dom"
import { fetchRecords, fetchServer } from "@/lib/api"
import type { Server } from "@/lib/api"
import { PlayerChart } from "@/components/ServerDetail/PlayerChart"
import { ServerDetailHeader } from "@/components/ServerDetail/ServerDetailHeader"
import { TimeIntervalSelector } from "@/components/ServerDetail/TimeIntervalSelector"
import { StatsSection } from "@/components/ServerDetail/StatsSection"
import { Button } from "@/components/ui/button"
import { BarChart } from "lucide-react"
import { Layout } from "@/components/layout"
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
    const locale = language === "fr" ? "fr-FR" : "en-US"

    return (
        <Layout>
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
                    <ServerDetailHeader server={server} t={t} />

                    <TimeIntervalSelector
                        selectedRange={selectedRange}
                        setSelectedRange={setSelectedRange}
                        selectedInterval={selectedInterval}
                        setSelectedInterval={setSelectedInterval}
                        timeRanges={TIME_RANGES}
                        intervals={INTERVALS}
                        containerClassName="w-full md:w-auto md:ml-auto"
                    />
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
                    <StatsSection stats={stats} locale={locale} t={t} />
                )}
            </div>
        </Layout>
    )
}
