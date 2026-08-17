import { useState, lazy, Suspense } from "react"
import type { Server } from "@/core/lib/api"
const MiniChart = lazy(() => import("./MiniChart").then(m => ({ default: m.MiniChart })))
import { cn, getServerIp, copyServerIp, formatMinecraftVersion } from "@/core/lib/utils"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { Check, Copy, Wifi, WifiOff } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { parseLegacyText } from "@/ui/motd/parser"
import { CursorTooltip } from "@/ui/motd/components/CursorTooltip"
import { useClientInfo } from "@/core/contexts/ClientInfoContext"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"
import { PlatformBadge } from "@/ui/components/PlatformBadge"
import { Link } from "react-router"

interface ServerCardProps {
    server: Server
    to?: string
}

export function ServerCard({ server, to }: ServerCardProps) {
    const { t, language } = useLanguage()
    const { getLabyInfo, getLunarInfo } = useClientInfo()
    const [copied, setCopied] = useState(false)

    const records = server.data || []

    const isOnline = server.last_status === "online"
    const isOffline = server.last_status === "offline"

    const { displayIp } = getServerIp(server.ip, server.port, server.type)
    
    const labyInfo = getLabyInfo(server.ip)
    const lunarInfo = getLunarInfo(server.ip)

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        copyServerIp(server.ip, server.port, server.type).then()
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className={cn(
                "relative flex flex-col justify-between shadow-sm border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-sm p-5 w-full rounded-2xl h-[185px] transition-all duration-300 ease-in-out group",
                to ? "hover:border-indigo-500/30 dark:hover:border-indigo-500/20 hover:shadow-md hover:-translate-y-0.5" : ""
            )}
        >
            {/* Top row: Favicon, Name, IP address, and Player/Status */}
            <div className="flex flex-row gap-4 w-full min-w-0 items-start">
                {/* Favicon */}
                <div className="relative flex-shrink-0">
                    <ServerIcon
                        serverId={server.id}
                        alt={t("alt.serverLogo" as any, { name: server.name })}
                        className="h-12 w-12 rounded-xl shadow-md border border-slate-100/60 dark:border-zinc-800/80 object-cover"
                    />
                </div>

                {/* Name & IP Copy button */}
                <div className="flex flex-col flex-grow min-w-0 gap-1.5 justify-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {to ? (
                            <Link to={to} prefetch="intent" className="text-[16px] font-bold text-slate-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors tracking-tight truncate leading-tight focus:outline-none after:absolute after:inset-0 after:z-0">
                                {server.name}
                            </Link>
                        ) : (
                            <h2 className="text-[16px] font-bold text-slate-900 dark:text-zinc-100 transition-colors tracking-tight truncate leading-tight">
                                {server.name}
                            </h2>
                        )}
                        {lunarInfo && <LunarLogo className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                        {labyInfo && <LabyLogo className="w-3.5 h-3.5 text-slate-900 dark:text-white shrink-0" />}
                    </div>
                    
                    <button 
                        onClick={handleCopy}
                        className="relative z-10 group/copy inline-flex items-center gap-1.5 self-start text-[11px] font-mono text-slate-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-slate-100/50 dark:bg-zinc-800/30 hover:bg-slate-100 dark:hover:bg-zinc-800/60 border border-slate-200/50 dark:border-zinc-800/55 px-2 py-0.5 rounded-md cursor-pointer max-w-full"
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
                                {server.last_sample ? (
                                    <CursorTooltip 
                                        fontHeight={18}
                                        content={
                                            <div className="flex flex-col text-left whitespace-pre-wrap">
                                                {server.last_sample.trimEnd().split('\n').map((line, i) => (
                                                    <div key={i} className="min-h-[18px]">
                                                        {parseLegacyText(line)}
                                                    </div>
                                                ))}
                                            </div>
                                        }
                                    >
                                        <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200 cursor-default select-none border-b border-dashed border-slate-400 dark:border-zinc-500">
                                            {new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(server.last_connected ?? 0)}
                                        </span>
                                    </CursorTooltip>
                                ) : (
                                    <span className="text-sm font-extrabold text-slate-700 dark:text-zinc-200">
                                        {new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(server.last_connected ?? 0)}
                                    </span>
                                )}
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
                <Suspense fallback={<div className="h-full w-full" />}>
                    <MiniChart data={records} />
                </Suspense>
            </div>

            {/* Bottom row: Version badge and stats info */}
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-2 border-t border-slate-100/50 dark:border-zinc-800/30">
                <div className="flex flex-row items-center gap-1.5 truncate">
                    {server.type && <PlatformBadge type={server.type} />}
                    {server.last_version ? (
                        <span className="inline-flex items-center rounded-lg border border-slate-200/55 dark:border-zinc-800 px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 shadow-xs whitespace-nowrap">
                            {t("common.version", { version: formatMinecraftVersion(server.last_version) })}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-lg border border-slate-100 dark:border-zinc-800/40 px-2 py-0.5 text-[10px] font-semibold bg-slate-50 dark:bg-zinc-900/30 text-slate-400 dark:text-zinc-600 shadow-xs whitespace-nowrap">
                            {t("common.unknownVersion")}
                        </span>
                    )}
                </div>

                <div className={cn(
                    "flex items-center gap-1 text-[10px] font-medium",
                    isOnline ? "text-emerald-500/90 dark:text-emerald-400/90" : "text-rose-500/90 dark:text-rose-400/90"
                )}>
                    {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {isOnline ? t("common.online") : t("common.offline")}
                </div>
            </div>
        </div>
    )
}
