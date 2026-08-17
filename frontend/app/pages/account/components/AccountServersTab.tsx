import type { Server } from "@/core/lib/api";
import { ServerCard } from "@/pages/home/components/ServerCard";
import { ServerCardSkeleton } from "@/pages/home/components/ServerCardSkeleton";
import { Server as ServerIcon } from "lucide-react";
import { RenameServerModal } from "./RenameServerModal";

interface AccountServersTabProps {
    t: (key: string, options?: any) => string;
    loading: boolean;
    servers: Server[];
    loadData: () => void;
}

export function AccountServersTab({ t, loading, servers, loadData }: AccountServersTabProps) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("profile.servers.title")}</h2>
                    <p className="text-muted-foreground mt-1 text-sm">{t("profile.servers.description")}</p>
                </div>
            </div>
            
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <ServerCardSkeleton key={i} />
                    ))}
                </div>
            ) : servers.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center">
                    <ServerIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t("profile.servers.noServersTitle")}</h3>
                    <p className="text-muted-foreground mt-1 max-w-sm">{t("profile.servers.noServersDescription")}</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {servers.map((s) => (
                        <div key={s.id} className="relative group">
                            <ServerCard server={s} />
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/95 backdrop-blur-md rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-0.5">
                                <RenameServerModal server={s} onSuccess={loadData} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
