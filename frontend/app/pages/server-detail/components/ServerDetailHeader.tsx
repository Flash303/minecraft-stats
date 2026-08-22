import { useState } from "react"
import { useNavigate } from "react-router"
import type { Server } from "@/core/lib/api"
import type { LunarServer } from "@/core/lib/lunar"
import { Button } from "@/ui/components/button"
import { Badge } from "@/ui/components/badge"
import { ArrowLeft, Wifi, WifiOff, Copy, Check, User as UserIcon, Calendar } from "lucide-react"
import { cn, getServerIp, copyServerIp, formatMinecraftVersion } from "@/core/lib/utils"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"
import { PlatformBadge } from "@/ui/components/PlatformBadge"

import type { LabyModServer } from "@/core/lib/labymod"

interface ServerDetailHeaderProps {
    server: Server
    t: (key: string) => string
    locale?: string
    lunarInfo?: LunarServer
    labyInfo?: LabyModServer
}

export function ServerDetailHeader({ server, t, locale, lunarInfo, labyInfo }: ServerDetailHeaderProps) {
    const [copied, setCopied] = useState(false)
    const navigate = useNavigate()

    const isOnline = server.last_status === "online"
    const { displayIp } = getServerIp(server.ip, server.port, server.type)

    const handleCopy = () => {
        copyServerIp(server.ip, server.port, server.type)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Ctrl/Cmd+Click et clic molette → laisser le navigateur gérer nativement (nouvel onglet en arrière-plan)
        if (e.ctrlKey || e.metaKey || e.button === 1) return
        // Clic normal → navigate(-1) au lieu de naviguer vers "/"
        e.preventDefault()
        if (window.history.length > 2 || (window.history.state && window.history.state.idx > 0)) {
            navigate(-1)
        } else {
            navigate("/")
        }
    }

    return (
        <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" className="flex-shrink-0" asChild>
                <a href="/" onClick={handleBackClick}>
                    <ArrowLeft className="h-4 w-4" />
                </a>
            </Button>
            <div className="flex min-w-0 items-center gap-3">
                <ServerIcon
                    serverId={server.id}
                    alt={t("alt.serverLogo", { name: server.name })}
                    className="h-10 w-10 rounded shadow-sm flex-shrink-0 object-cover"
                />
                <div className="flex flex-col min-w-0">
                    {/* Nom + icônes launcher */}
                    <div className="flex items-center gap-2 mb-1 min-w-0">
                        <h1 className="font-bold text-xl leading-none line-clamp-1 min-w-0">
                            {server.name}
                        </h1>
                        {lunarInfo && (
                            <LunarLogo className={cn("w-4 h-4 shrink-0", lunarInfo.partnered ? "text-orange-500" : "text-sky-500")} title="Lunar Client" />
                        )}
                        {labyInfo && (
                            <LabyLogo className={cn("w-4 h-4 shrink-0", labyInfo.partnered ? "text-cyan-500" : "text-foreground")} title="LabyMod" />
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border",
                            isOnline ? "bg-success/10 border-success/20 text-success" : "bg-destructive/10 border-destructive/20 text-destructive"
                        )}>
                            <span className="relative flex h-2 w-2">
                                {isOnline && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>}
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                            </span>
                            {isOnline ? t("common.online") : t("common.offline")}
                        </div>
                        {server.type && <PlatformBadge type={server.type} />}
                        <button 
                            onClick={handleCopy}
                            className="flex items-center gap-1 text-muted-foreground text-xs font-mono hover:text-primary transition-colors group/copy max-w-[130px] sm:max-w-none cursor-pointer focus:outline-none"
                        >
                            <span className="truncate">{displayIp}</span>
                            {copied ? (
                                <Check className="h-2.5 w-2.5 text-success flex-shrink-0" />
                            ) : (
                                <Copy className="h-2.5 w-2.5 opacity-0 group-hover/copy:opacity-100 transition-opacity flex-shrink-0" />
                            )}
                        </button>
                        {server.last_version && (
                            <Badge variant="secondary" className="font-mono text-xs whitespace-nowrap">
                                v{formatMinecraftVersion(server.last_version)}
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
                        {server.registered_date && (
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] bg-secondary/50 px-2 py-0.5 rounded-full border border-border/50">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(server.registered_date * 1000).toLocaleDateString(locale)}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
