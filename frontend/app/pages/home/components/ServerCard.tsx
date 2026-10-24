import { lazy, Suspense } from "react"
import type { Server } from "@/core/lib/api"
const MiniChart = lazy(() => import("./MiniChart").then(m => ({ default: m.MiniChart })))
import { MiniChartSkeleton } from "./MiniChartSkeleton"
import { cn, getServerIp, resolveServerVersion, formatNumber } from "@/core/lib/utils"
import { useCopyServerIp } from "@/core/hooks/useCopyServerIp"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { lunarLogoClass, labyLogoClass } from "@/core/lib/theme-colors"
import { Check, Copy, Wifi, WifiOff } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { parseLegacyText } from "@/ui/motd/parser"
import { CursorTooltip } from "@/ui/motd/components/CursorTooltip"

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
    const { copied, copy } = useCopyServerIp(server.ip, server.port, server.type)

    const isOnline = server.last_status === "online"
    const isOffline = server.last_status === "offline"

    const { displayIp } = getServerIp(server.ip, server.port, server.type)

    const displayVersion = resolveServerVersion(server.last_version, server.last_protocol_version, server.type)
    
    const labyInfo = server.client_infos?.laby;
    const lunarInfo = server.client_infos?.lunar;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        copy()
    }

    return (
        <div
            className={cn(
                "relative @container flex w-full flex-col justify-between gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur-sm min-h-[185px] h-full transition-all duration-300 ease-in-out group sm:p-5",
                to ? "hover:border-primary/30 dark:hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5" : ""
            )}
        >
            {/* Top row: Favicon, Name, IP address, and Player/Status */}
            <div className="flex flex-row gap-2 w-full min-w-0 items-start sm:gap-4">
                {/* Favicon */}
                <div className="relative flex-shrink-0">
                    <ServerIcon
                        serverId={server.id}
                        alt={t("alt.serverLogo", { name: server.name })}
                        className="h-9 w-9 rounded-lg shadow-md border border-border/60 object-cover sm:h-12 sm:w-12 sm:rounded-xl"
                    />
                </div>

                {/* Name & IP Copy button */}
                <div className="flex flex-col flex-grow min-w-0 gap-1.5 justify-center">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {to ? (
                            <Link to={to} prefetch="intent" className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight truncate leading-tight focus:outline-none after:absolute after:inset-0 after:z-0 sm:text-base">
                                {server.name}
                            </Link>
                        ) : (
                            <h2 className="text-sm font-bold text-foreground transition-colors tracking-tight truncate leading-tight sm:text-base">
                                {server.name}
                            </h2>
                        )}
                        {lunarInfo && <LunarLogo className={cn("w-3.5 h-3.5 shrink-0", lunarLogoClass(lunarInfo.partner))} />}
                        {labyInfo && <LabyLogo className={cn("w-3.5 h-3.5 shrink-0", labyLogoClass(labyInfo.partner))} />}
                    </div>
                    
                    <div className="flex min-w-0 items-center gap-1.5">
                        <button 
                            onClick={handleCopy}
                            aria-label={`Copier l'IP du serveur ${server.name}`}
                            className="relative z-10 group/copy inline-flex min-w-0 flex-1 items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-all bg-muted/50 hover:bg-accent/60 border border-border/50 px-2 py-0.5 rounded-md cursor-pointer max-w-full"
                        >
                            <span className="truncate">{displayIp}</span>
                            {copied ? (
                                <Check aria-hidden="true" className="h-3 w-3 text-success flex-shrink-0" />
                            ) : (
                                <Copy aria-hidden="true" className="h-3 w-3 opacity-60 md:opacity-0 md:group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
                            )}
                        </button>
                        {/* Compact player count, shown instead of the top-right
                            block on narrow cards where all three would not fit. */}
                        <span className="flex shrink-0 items-center gap-1 text-xs font-extrabold text-foreground sm:hidden" aria-hidden="true">
                            <span className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isOnline ? "bg-success animate-pulse" : isOffline ? "bg-destructive" : "bg-muted-foreground"
                            )} />
                            {isOnline ? formatNumber(language, server.last_connected ?? 0) : null}
                        </span>
                    </div>
                </div>

                {/* Player count / status indicator (desktop: roomy cards only) */}
                <div className="hidden shrink-0 flex-col items-end gap-0.5 pt-0.5 sm:flex">
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
                                            {formatNumber(language, server.last_connected ?? 0)}
                                        </span>
                                    </CursorTooltip>
                                ) : (
                                    <span className="text-sm font-extrabold text-foreground">
                                        {formatNumber(language, server.last_connected ?? 0)}
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
                <Suspense fallback={<MiniChartSkeleton />}>
                    <MiniChart data={server.data} />
                </Suspense>
            </div>

            {/* Bottom row: Version badge and stats info */}
            <div className="flex w-full flex-row items-center justify-between gap-2 border-t border-border/30 pt-2">
                <div className="flex min-w-0 flex-row items-center gap-1.5 overflow-hidden">
                    {server.type && <PlatformBadge type={server.type} className="shrink-0" />}
                    {displayVersion ? (
                        <span className="hidden min-w-0 items-center rounded-lg border border-border/50 bg-muted/50 px-2 py-0.5 text-2xs font-semibold text-muted-foreground shadow-xs @min-[11rem]:inline-flex">
                            <span className="truncate">{t("common.version", { version: displayVersion })}</span>
                        </span>
                    ) : (
                        <span className="hidden min-w-0 items-center rounded-lg border border-border/40 bg-muted/30 px-2 py-0.5 text-2xs font-semibold text-muted-foreground shadow-xs @min-[11rem]:inline-flex">
                            <span className="truncate">{t("common.unknownVersion")}</span>
                        </span>
                    )}
                </div>

                <div className={cn(
                    "flex shrink-0 items-center gap-1 text-2xs font-medium",
                    isOnline ? "text-success" : "text-destructive"
                )}>
                    {isOnline ? <Wifi aria-hidden="true" className="h-3 w-3" /> : <WifiOff aria-hidden="true" className="h-3 w-3" />}
                    {isOnline ? t("common.online") : t("common.offline")}
                </div>
            </div>
        </div>
    )
}
