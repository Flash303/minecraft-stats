import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Activity,
    Info,
    Server as ServerIcon,
    Eye,
    Users,
    Cpu
} from "lucide-react"

export interface AuditLog {
    id: string
    timestamp: string
    action: string
    type: "create" | "visibility" | "signup" | "system"
    details: string
}

interface LogsTabProps {
    auditLogs: AuditLog[]
    t: (key: string) => string
}

export function LogsTab({ auditLogs, t }: LogsTabProps) {
    return (
        <div className="flex flex-col gap-6">
            <Card className="bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 shadow-xs">
                <CardHeader>
                    <CardTitle className="text-md font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-indigo-500" />
                        {t("admin.auditLogs.title")}
                    </CardTitle>
                    <CardDescription>Consultez l'historique complet des actions d'administration et des événements importants.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                    
                    {/* Timeline container */}
                    <div className="relative border-l-2 border-slate-150 dark:border-zinc-800 pl-6 flex flex-col gap-6 ml-2">
                        {auditLogs.map((log) => {
                            let icon = <Info className="h-3.5 w-3.5" />
                            let bg = "bg-blue-500/10 text-blue-500"

                            if (log.type === "create") {
                                icon = <ServerIcon className="h-3.5 w-3.5" />
                                bg = "bg-indigo-500/10 text-indigo-500"
                            } else if (log.type === "visibility") {
                                icon = <Eye className="h-3.5 w-3.5" />
                                bg = "bg-amber-500/10 text-amber-500"
                            } else if (log.type === "signup") {
                                icon = <Users className="h-3.5 w-3.5" />
                                bg = "bg-emerald-500/10 text-emerald-500"
                            } else if (log.type === "system") {
                                icon = <Cpu className="h-3.5 w-3.5" />
                                bg = "bg-purple-500/10 text-purple-500"
                            }

                            return (
                                <div key={log.id} className="relative flex flex-col gap-1.5">
                                    {/* Timeline node icon bubble */}
                                    <div className={`absolute -left-[35px] top-0.5 h-6.5 w-6.5 rounded-full flex items-center justify-center border shadow-xs bg-white dark:bg-zinc-900 ${bg}`}>
                                        {icon}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-foreground">{log.action}</span>
                                        <span className="text-[10px] text-muted-foreground font-mono">{new Date(log.timestamp).toLocaleString()}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed font-medium">{log.details}</p>
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
