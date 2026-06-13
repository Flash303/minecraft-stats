import { useState, useEffect } from "react"
import type { Server } from "@/lib/api"
import { fetchRecords } from "@/lib/api"
import { MiniChart } from "./MiniChart"
import default_icon from "@/assets/default_favicon.svg"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

interface ServerCardProps {
    server: Server
}

export function ServerCard({ server }: ServerCardProps) {
    const { t, language } = useLanguage()
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
        e.preventDefault()
        navigator.clipboard.writeText(fullIp).then()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className="relative flex flex-col justify-between shadow-sm border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-sm p-5 w-full rounded-2xl h-[185px] transition-all duration-300 ease-in-out group hover:border-indigo-500/30 dark:hover:border-indigo-500/20 hover:shadow-md hover:-translate-y-0.5"
        >
            {/* Top row: Favicon, Name, IP address, and Player/Status */}
            <div className="flex flex-row gap-4 w-full min-w-0 items-start">
                {/* Favicon */}
                <div className="relative flex-shrink-0">
                    {server.last_favicon ? (
                        <img
                            src={server.last_favicon}
                            alt=""
                            className="h-12 w-12 rounded-xl shadow-md border border-slate-100/60 dark:border-zinc-800/80 object-cover"
                        />
                    ) : (
                        <img
                            src={default_icon}
                            alt=""
                            className="h-12 w-12 rounded-xl shadow-md border border-slate-100/60 dark:border-zinc-800/80 object-cover"
                        />
                    )}
                </div>

                {/* Name & IP Copy button */}
                <div className="flex flex-col flex-grow min-w-0 gap-1.5 justify-center">
                    <h3 className="text-[16px] font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate leading-tight">
                        {server.name}
                    </h3>
                    
                    <button 
                        onClick={handleCopy}
                        className="group/copy inline-flex items-center gap-1.5 self-start text-[11px] font-mono text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-slate-100/50 dark:bg-zinc-800/30 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-800/55 px-2 py-0.5 rounded-md cursor-pointer max-w-full"
                    >
                        <span className="truncate">{displayIp}</span>
                        {copied ? (
                            <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                            <Copy className="h-3 w-3 opacity-60 md:opacity-0 md:group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
                        )}
                    </button>
                </div>

                {/* Player count / status indicator */}
                <div className="flex-shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
                    <div className="flex flex-row items-center gap-1.5">
                        {isOnline ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200">
                                    {new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(server.last_connected ?? 0)}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className={cn(
                                    "h-2 w-2 rounded-full",
                                    isOffline ? "bg-rose-500" : "bg-slate-450"
                                )} />
                                <span className="text-xs font-bold text-slate-400 dark:text-zinc-550 uppercase tracking-wider">
                                    {t("common.offline")}
                                </span>
                            </>
                        )}
                    </div>
                    {isOnline && (
                        <span className="text-[9.5px] text-slate-400 dark:text-zinc-500 font-medium lowercase leading-none">
                            {t("common.players")}
                        </span>
                    )}
                </div>
            </div>

            {/* Middle part: Sparkline mini chart (spanning full width of content) */}
            <div className="w-full h-12 opacity-80 group-hover:opacity-100 transition-opacity my-2 overflow-hidden flex items-center">
                <MiniChart data={records} />
            </div>

            {/* Bottom row: Version badge and stats info */}
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-2 border-t border-slate-100/50 dark:border-zinc-800/30">
                <div className="flex flex-row items-center gap-1.5 truncate">
                    {server.last_version ? (
                        <span className="inline-flex items-center rounded-lg border border-slate-200/55 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 shadow-xs whitespace-nowrap">
                            Version {server.last_version}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-lg border border-slate-100 dark:border-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 shadow-xs whitespace-nowrap">
                            Version inconnue
                        </span>
                    )}
                </div>

                <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-medium">
                    {isOnline ? "En ligne" : "Hors ligne"}
                </div>
            </div>
        </div>
    )
}
