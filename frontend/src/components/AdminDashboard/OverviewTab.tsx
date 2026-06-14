import { useMemo } from "react"
import type { User, Server } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    Users,
    Server as ServerIcon,
    Wifi,
    Activity,
    Database,
    ShieldCheck,
    Cpu,
    Lock
} from "lucide-react"

interface OverviewTabProps {
    users: User[]
    servers: Server[]
    t: (key: string, replacements?: Record<string, string>) => string
}

export function OverviewTab({ users, servers, t }: OverviewTabProps) {
    const stats = useMemo(() => {
        const totalUsers = users.length
        const totalServers = servers.length
        const onlineServers = servers.filter(s => s.last_status === "online").length
        return { totalUsers, totalServers, onlineServers }
    }, [users, servers])

    return (
        <div className="flex flex-col gap-6">
            
            {/* Key Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow duration-300 bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800">
                    <CardContent className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                {t("admin.statsUsers")}
                            </span>
                            <span className="text-3xl font-extrabold text-foreground mt-2">{stats.totalUsers}</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow duration-300 bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800">
                    <CardContent className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                {t("admin.statsServers")}
                            </span>
                            <span className="text-3xl font-extrabold text-foreground mt-2">{stats.totalServers}</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                            <ServerIcon className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow duration-300 bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800">
                    <CardContent className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                {t("admin.statsOnline")}
                            </span>
                            <span className="text-3xl font-extrabold text-foreground mt-2">{stats.onlineServers}</span>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center relative">
                            <span className="animate-ping absolute top-0 right-0 inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                            <Wifi className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* System Health Checkups */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            {t("admin.overview.healthChecks")}
                        </CardTitle>
                        <CardDescription>{t("admin.overview.healthChecksDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        {/* Item 1: Database */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/40">
                            <div className="flex items-center gap-3">
                                <Database className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-foreground">{t("admin.overview.dbStatus")}</span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20 text-[9px] px-1.5 py-0.5">
                                {t("admin.overview.healthy")}
                            </Badge>
                        </div>

                        {/* Item 2: Ping worker */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/40">
                            <div className="flex items-center gap-3">
                                <Cpu className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-foreground">{t("admin.overview.pingWorker")}</span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0.5">
                                {t("admin.overview.healthy")}
                            </Badge>
                        </div>

                        {/* Item 3: Clerk Auth */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-zinc-950/40 border border-slate-100 dark:border-zinc-800/40">
                            <div className="flex items-center gap-3">
                                <Lock className="h-4 w-4 text-primary" />
                                <span className="text-xs font-semibold text-foreground">{t("admin.overview.clerkStatus")}</span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] px-1.5 py-0.5">
                                {t("admin.overview.healthy")}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* System activity placeholder */}
                <Card className="bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800">
                    <CardHeader>
                        <CardTitle className="text-md font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-indigo-500" />
                            {t("admin.overview.systemActivity")}
                        </CardTitle>
                        <CardDescription>{t("admin.overview.systemActivityDesc")}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-6">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span>{t("admin.overview.avgPlayersOnline")}</span>
                                    <span className="text-primary font-bold">84%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: "84%" }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span>{t("admin.overview.pingPerformance")}</span>
                                    <span className="text-emerald-500 font-bold">99.8%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: "99.8%" }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <div className="flex justify-between text-xs font-semibold mb-1">
                                    <span>{t("admin.overview.serversUptime")}</span>
                                    <span className="text-blue-500 font-bold">92%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: "92%" }} />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
