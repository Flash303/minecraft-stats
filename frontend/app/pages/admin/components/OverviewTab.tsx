import { useMemo } from "react"
import { Link } from "react-router"
import type { User, Server } from "@/core/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/ui/components/card"
import { ServerIcon as CustomServerIcon } from "@/ui/components/ServerIcon"
import {
    Users,
    Server as ServerIcon,
    Wifi,
    Gamepad2,
    Gauge,
    EyeOff,
    ExternalLink
} from "lucide-react"

interface OverviewTabProps {
    users: User[]
    servers: Server[]
    t: (key: string, replacements?: Record<string, string>) => string
}

interface StatCardProps {
    label: string
    value: number | string
    icon: typeof Users
    iconClassName: string
}

function StatCard({ label, value, icon: Icon, iconClassName }: StatCardProps) {
    return (
        <Card className="hover:shadow-md transition-shadow duration-300 bg-card border-border/60">
            <CardContent className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider truncate">
                        {label}
                    </span>
                    <span className="text-3xl font-extrabold text-foreground mt-2 tabular-nums">{value}</span>
                </div>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconClassName}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </CardContent>
        </Card>
    )
}

export function OverviewTab({ users, servers, t }: OverviewTabProps) {
    const stats = useMemo(() => {
        const totalUsers = users.length
        const totalServers = servers.length
        const onlineServers = servers.filter(s => s.last_status === "online")
        const offlineCount = totalServers - onlineServers.length
        const hiddenCount = servers.filter(s => s.hidden === true).length
        const playersOnline = onlineServers.reduce((sum, s) => sum + (s.last_connected ?? 0), 0)
        const capacityTotal = onlineServers.reduce((sum, s) => sum + (s.last_max_players ?? s.max_players ?? 0), 0)
        const availability = totalServers > 0 ? Math.round((onlineServers.length / totalServers) * 100) : 0
        const topServers = [...onlineServers]
            .sort((a, b) => (b.last_connected ?? 0) - (a.last_connected ?? 0))
            .slice(0, 5)

        return {
            totalUsers,
            totalServers,
            onlineCount: onlineServers.length,
            offlineCount,
            hiddenCount,
            playersOnline,
            capacityTotal,
            availability,
            topServers
        }
    }, [users, servers])

    const distributionRows = [
        { key: "online", count: stats.onlineCount, barClass: "bg-success", dotClass: "bg-success" },
        { key: "offline", count: stats.offlineCount, barClass: "bg-rose-500", dotClass: "bg-rose-500" },
        { key: "hidden", count: stats.hiddenCount, barClass: "bg-warning", dotClass: "bg-warning" },
    ] as const

    return (
        <div className="flex flex-col gap-6">

            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <StatCard
                    label={t("admin.statsUsers")}
                    value={stats.totalUsers}
                    icon={Users}
                    iconClassName="bg-blue-500/10 text-blue-500"
                />
                <StatCard
                    label={t("admin.statsServers")}
                    value={stats.totalServers}
                    icon={ServerIcon}
                    iconClassName="bg-indigo-500/10 text-indigo-500"
                />
                <StatCard
                    label={t("admin.statsOnline")}
                    value={stats.onlineCount}
                    icon={Wifi}
                    iconClassName="bg-success/10 text-success relative"
                />
                <StatCard
                    label={t("admin.statsPlayers")}
                    value={stats.playersOnline.toLocaleString()}
                    icon={Gamepad2}
                    iconClassName="bg-amber-500/10 text-amber-500"
                />
            </div>

            {/* Server fleet overview */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Top servers by current players (real data) */}
                <Card className="lg:col-span-3 bg-card border-border/60">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <Gauge className="h-5 w-5 text-primary" />
                            {t("admin.overview.topServers")}
                        </CardTitle>
                        <CardDescription>{t("admin.overview.topServersDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2">
                        {stats.topServers.length > 0 ? (
                            stats.topServers.map((server, index) => {
                                const maxPlayers = server.last_max_players ?? server.max_players ?? null
                                return (
                                    <Link
                                        key={server.id}
                                        to={`/server/${server.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="group flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/40 transition-all"
                                    >
                                        <span className="text-xs font-bold text-muted-foreground/60 w-4 text-center tabular-nums">
                                            {index + 1}
                                        </span>
                                        <CustomServerIcon
                                            serverId={server.id}
                                            alt={t("alt.serverLogo", { name: server.name })}
                                            className="h-8 w-8 rounded shadow-xs flex-shrink-0 border"
                                        />
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <span className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                                {server.name}
                                                {server.hidden && (
                                                    <>
                                                        {" "}
                                                        <EyeOff className="inline h-3 w-3 text-warning align-[-1px]" aria-label={t("admin.hiddenBadge")} />
                                                    </>
                                                )}
                                            </span>
                                            <span className="font-mono text-[10px] text-muted-foreground truncate">
                                                {server.ip}:{server.port}
                                            </span>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className="text-sm font-bold text-success tabular-nums">
                                                {server.last_connected ?? 0}
                                                {maxPlayers ? (
                                                    <span className="text-[10px] font-medium text-muted-foreground"> / {maxPlayers}</span>
                                                ) : null}
                                            </span>
                                            <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">
                                                {t("admin.servers.tablePlayers")}
                                            </p>
                                        </div>
                                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity flex-shrink-0" />
                                    </Link>
                                )
                            })
                        ) : (
                            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 text-sm italic">
                                {t("admin.overview.noOnlineServers")}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Real fleet distribution */}
                <Card className="lg:col-span-2 bg-card border-border/60">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <ServerIcon className="h-5 w-5 text-indigo-500" />
                            {t("admin.overview.distribution")}
                        </CardTitle>
                        <CardDescription>{t("admin.overview.distributionDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-5">
                        {distributionRows.map((row) => {
                            const pct = stats.totalServers > 0 ? Math.round((row.count / stats.totalServers) * 100) : 0
                            return (
                                <div key={row.key} className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs font-semibold">
                                        <span className="flex items-center gap-2">
                                            <span className={`h-1.5 w-1.5 rounded-full ${row.dotClass}`} aria-hidden />
                                            {t(`admin.servers.status${row.key.charAt(0).toUpperCase()}${row.key.slice(1)}`)}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                            {row.count} ({pct}%)
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${row.barClass} rounded-full transition-all duration-500`}
                                            style={{ width: `${Math.max(pct, row.count > 0 ? 2 : 0)}%` }}
                                            role="progressbar"
                                            aria-valuenow={row.count}
                                            aria-valuemin={0}
                                            aria-valuemax={stats.totalServers}
                                            aria-label={t(`admin.servers.status${row.key.charAt(0).toUpperCase()}${row.key.slice(1)}`)}
                                        />
                                    </div>
                                </div>
                            )
                        })}

                        <div className="mt-1 pt-4 border-t border-border/60 flex items-center justify-between">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                {t("admin.overview.availability")}
                            </span>
                            <span className={`text-lg font-extrabold tabular-nums ${
                                stats.availability >= 70 ? "text-success" : stats.availability >= 40 ? "text-warning" : "text-destructive"
                            }`}>
                                {stats.availability}%
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
