import { useState, useEffect, useCallback } from "react"
import type { Server } from "@/lib/api"
import { fetchRecords } from "@/lib/api"
import { PlayerChart } from "@/components/PlayerChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { ArrowLeft } from "lucide-react"

interface ServerDetailProps {
    server: Server
    onBack: () => void
}

const TIME_RANGES = [
    { label: "Last hour", value: 3600000 },
    { label: "Last 6 hours", value: 21600000 },
    { label: "Last 24 hours", value: 86400000 },
    { label: "Last 7 days", value: 604800000 },
    { label: "Last 30 days", value: 2592000000 }
]

const INTERVALS = [
    { label: "10 sec", value: 10000 },
    { label: "1 min", value: 60000 },
    { label: "5 min", value: 300000 },
    { label: "30 min", value: 1800000 },
    { label: "1 hour", value: 3600000 }
]

export function ServerDetail({ server, onBack }: ServerDetailProps) {
    const [records, setRecords] = useState<{ date: number; value: number }[]>(
        []
    )
    const [loading, setLoading] = useState(true)
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[2].value)
    const [selectedInterval, setSelectedInterval] = useState(INTERVALS[1].value)

    const loadRecords = useCallback(async () => {
        setLoading(true)
        try {
            const from = Math.floor((Date.now() - selectedRange) / 1000)
            const data = await fetchRecords(server.id, from, selectedInterval)
            setRecords(data)
        } catch {
            setRecords([])
        } finally {
            setLoading(false)
        }
    }, [server.id, selectedRange, selectedInterval])

    useEffect(() => {
        loadRecords()
    }, [loadRecords])

    return (
        <div className="flex min-h-screen flex-col">
            <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
                <div className="container flex h-14 items-center gap-4 px-4">
                    <Button variant="ghost" size="icon" onClick={onBack}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex min-w-0 items-center gap-2">
                        {server.last_favicon ? (
                            <img
                                src={server.last_favicon}
                                alt=""
                                className="h-6 w-6 rounded"
                            />
                        ) : null}
                        <h1 className="truncate font-semibold">
                            {server.name}
                        </h1>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Select
                            value={String(selectedRange)}
                            onValueChange={(v: string) =>
                                setSelectedRange(Number(v))
                            }
                        >
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TIME_RANGES.map((r) => (
                                    <SelectItem
                                        key={r.value}
                                        value={String(r.value)}
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
                            <SelectTrigger className="w-[110px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERVALS.map((i) => (
                                    <SelectItem
                                        key={i.value}
                                        value={String(i.value)}
                                    >
                                        {i.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </header>
            <main className="container mx-auto flex-1 px-4 py-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Player Count Over Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-muted-foreground">
                                Loading chart...
                            </p>
                        ) : (
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
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
