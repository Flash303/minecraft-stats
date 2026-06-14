import { useState } from "react"
import { Link } from "react-router-dom"
import type { Server } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Wifi, WifiOff, Copy, Check, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface ServerDetailHeaderProps {
    server: Server
    t: (key: string) => string
}

export function ServerDetailHeader({ server, t }: ServerDetailHeaderProps) {
    const [copied, setCopied] = useState(false)

    const isOnline = server.last_status === "online"
    const displayIp = server.port === 25565 ? server.ip : `${server.ip}:${server.port}`
    const fullIp = `${server.ip}:${server.port}`

    const handleCopy = () => {
        navigator.clipboard.writeText(fullIp)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
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
                            className="flex items-center gap-1 text-muted-foreground text-[10px] font-mono hover:text-primary transition-colors group/copy max-w-[130px] sm:max-w-none cursor-pointer focus:outline-none"
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
    )
}
