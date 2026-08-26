import { useState, useRef, useEffect, lazy, Suspense } from "react"
import type { Server } from "@/core/lib/api"
const MiniChart = lazy(() => import("./MiniChart").then(m => ({ default: m.MiniChart })))
import { cn, getServerIp, copyServerIp, formatMinecraftVersion } from "@/core/lib/utils"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { lunarLogoClass, labyLogoClass } from "@/core/lib/theme-colors"
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
    const copiedTimerRef = useRef<number | null>(null)

    // Nettoie le timer de feedback "copié" au démontage
    useEffect(() => {
        return () => {
            if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
        }
    }, [])

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
        if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
        copiedTimerRef.current = window.setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div
            className={cn(
                "relative flex flex-col justify-between shadow-sm border border-border/80 bg-card/95 backdrop-blur-sm p-5 w-full rounded-2xl h-[185px] transition-all duration-300 ease-in-out group",
                to ? "hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5" : ""
            )}
        >
            {/* Top row: Favicon, Name, IP address, and Player/Status */}
            <div className="flex flex-row gap-4 w-full min-w-0 items-start">
                {/* Favicon */}
                <div className="relative flex-shrink-0">
                    <ServerIcon
                        serverId={server.id}
                        alt={t("alt.serverLogo", { name: server.name })}
                        className="h-12 w-12 rounded-xl shadow-md border border-border/60 object-cover"
                    />
                </div>

                {/* Name & IP Copy button */}
                <div className="flex flex-col flex-grow min-w-0 gap-1.5 justify-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {to ? (
                            <Link to={to} prefetch="intent" className="text-base font-bold text-foreground group-hover:text-primary transition-colors tracking-tight truncate leading-tight focus:outline-none after:absolute after:inset-0 after:z-0">
                                {server.name}
                            </Link>
                        ) : (
                            <h2 className="text-base font-bold text-foreground transition-colors tracking-tight truncate leading-tight">
                                {server.name}
                            </h2>
                        )}
                        {lunarInfo && <LunarLogo className={cn("w-3.5 h-3.5 shrink-0", lunarLogoClass(lunarInfo.partnered))} />}
                        {labyInfo && <LabyLogo className={cn("w-3.5 h-3.5 shrink-0", labyLogoClass(labyInfo.partnered))} />}
                    </div>
                    
                    <button 
                        onClick={handleCopy}
                        aria-label={`Copier l'IP du serveur ${server.name}`}
                        className="relative z-10 group/copy inline-flex items-center gap-1.5 self-start text-xs font-mono text-muted-foreground hover:text-primary transition-all bg-muted/50 hover:bg-accent/60 border border-border/50 px-2 py-0.5 rounded-md cursor-pointer max-w-full"
                    >
                        <span className="truncate">{displayIp}</span>
                        {copied ? (
                            <Check aria-hidden="true" className="h-3 w-3 text-success flex-shrink-0" />
                        ) : (
                            <Copy aria-hidden="true" className="h-3 w-3 opacity-60 md:opacity-0 md:group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
                        )}
                    </button>
                </div>

                {/* Player count / status indicator */}
                <div className="flex-shrink-0 flex flex-col items-end gap-0.5 pt-0.5">
                    <div className="flex flex-row items-center gap-1.5">
                        {isOnline ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/75 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
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
                                        <span className="text-sm font-extrabold text-foreground cursor-default select-none border-b border-dashed border-muted-foreground/50">
                                            {new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(server.last_connected ?? 0)}
                                        </span>
                                    </CursorTooltip>
                                ) : (
                                    <span className="text-sm font-extrabold text-foreground">
                                        {new Intl.NumberFormat(language === "fr" ? "fr-FR" : "en-US").format(server.last_connected ?? 0)}
                                    </span>
                                )}
                            </>
                        ) : (
                            <>
                                <span className={cn(
                                    "h-2 w-2 rounded-full",
                                    isOffline ? "bg-destructive" : "bg-muted-foreground"
                                )} />
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    {t("common.offline")}
                                </span>
                            </>
                        )}
                    </div>
                    {isOnline && (
                        <span className="text-2xs text-muted-foreground font-medium lowercase leading-none">
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
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-2 border-t border-border/30">
                <div className="flex flex-row items-center gap-1.5 truncate">
                    {server.type && <PlatformBadge type={server.type} />}
                    {server.last_version ? (
                        <span className="inline-flex items-center rounded-lg border border-border/50 px-2 py-0.5 text-2xs font-semibold bg-muted/50 text-muted-foreground shadow-xs whitespace-nowrap">
                            {t("common.version", { version: formatMinecraftVersion(server.last_version) })}
                        </span>
                    ) : (
                        <span className="inline-flex items-center rounded-lg border border-border/40 px-2 py-0.5 text-2xs font-semibold bg-muted/30 text-muted-foreground shadow-xs whitespace-nowrap">
                            {t("common.unknownVersion")}
                        </span>
                    )}
                </div>

                <div className={cn(
                    "flex items-center gap-1 text-2xs font-medium",
                    isOnline ? "text-success" : "text-destructive"
                )}>
                    {isOnline ? <Wifi aria-hidden="true" className="h-3 w-3" /> : <WifiOff aria-hidden="true" className="h-3 w-3" />}
                    {isOnline ? t("common.online") : t("common.offline")}
                </div>
            </div>
        </div>
    )
}
