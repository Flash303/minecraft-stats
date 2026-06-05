import { useState, useEffect } from "react"
import type { Server } from "@/lib/api"
import { fetchRecords } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { MiniChart } from "./MiniChart"
import default_icon from "@/assets/default_favicon.svg"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"

interface ServerCardProps {
    server: Server
}

export function ServerCard({ server }: ServerCardProps) {
    const [records, setRecords] = useState<{ date: number; value: number }[]>([])
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const loadRecords = async () => {
            try {
                const from = Math.floor((Date.now() - 86400000) / 1000)
                const data = await fetchRecords(server.id, from, 300000)
                setRecords(data)
            } catch {
                setRecords([])
            }
        }
        loadRecords().then()
    }, [server.id])

    const isOnline = server.last_status === "online"
    const isOffline = server.last_status === "offline"

    const displayIp = server.port === 25565 ? server.ip : `${server.ip}:${server.port}`
    const fullIp = `${server.ip}:${server.port}`

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        navigator.clipboard.writeText(fullIp).then()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Card
            className="cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 overflow-hidden flex flex-col md:flex-row items-stretch border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 group min-h-[140px]"
        >
            <div className="flex flex-1 items-center gap-5 p-6 min-w-0">
                <div className="relative flex-shrink-0">
                    {server.last_favicon ? (
                        <img
                            src={server.last_favicon}
                            alt=""
                            className="h-16 w-16 rounded-xl shadow-md border border-slate-100 dark:border-slate-800"
                        />
                    ) : (
                        <img
                            src={default_icon}
                            alt=""
                            className="h-16 w-16 rounded-xl shadow-md border border-slate-100 dark:border-slate-800"
                        />
                    )}
                    <div 
                        className={cn(
                            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white dark:border-slate-950 shadow-sm",
                            isOnline ? "bg-emerald-500" : isOffline ? "bg-rose-500" : "bg-slate-400"
                        )}
                    />
                </div>
                
                <div className="min-w-0 flex-1 flex flex-col justify-center">
                    <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors tracking-tight leading-tight line-clamp-2">
                        {server.name}
                    </h3>
                    <div className="mt-2 space-y-1">
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 dark:text-slate-500 hover:text-primary transition-colors bg-muted/30 px-2 py-0.5 rounded group/copy"
                        >
                            <span className="truncate">{displayIp}</span>
                            {copied ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                                <Copy className="h-3 w-3 opacity-0 group-hover/copy:opacity-100 transition-opacity" />
                            )}
                        </button>
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "text-[12px] font-bold uppercase tracking-wider",
                                isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400 dark:text-slate-600"
                            )}>
                                {isOnline ? (
                                    <>{new Intl.NumberFormat("fr-FR").format(server.last_connected ?? 0)} joueurs</>
                                ) : (
                                    <>Hors ligne</>
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="w-full md:w-48 h-24 md:h-auto flex items-center pr-6 pl-6 md:pl-0 pb-4 md:pb-0 opacity-80 group-hover:opacity-100 transition-opacity bg-muted/5 md:bg-transparent">
                <div className="w-full h-full flex items-center justify-end">
                    <MiniChart data={records} />
                </div>
            </div>
        </Card>
    )
}
