import { Button } from "@/ui/components/button";
import { ShieldAlert, CheckCircle2, BellOff, Bell, Trash2 } from "lucide-react";
import type { Alert } from "@/core/lib/api";

interface ExtendedAlert extends Alert {
    serverId: number;
    serverName: string;
}

interface AccountAlertsTabProps {
    t: (key: string, options?: any) => string;
    isPushSupported: boolean;
    checkingSubscription: boolean;
    isSubscribed: boolean;
    actionLoading: boolean;
    handleUnsubscribe: () => void;
    handleSubscribe: () => void;
    allAlerts: ExtendedAlert[];
    handleDeleteAlert: (id: number) => void;
}

export function AccountAlertsTab({
    t,
    isPushSupported,
    checkingSubscription,
    isSubscribed,
    actionLoading,
    handleUnsubscribe,
    handleSubscribe,
    allAlerts,
    handleDeleteAlert
}: AccountAlertsTabProps) {
    return (
        <div className="space-y-8 max-w-4xl">
            {/* Push Settings */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">{t("profile.alerts.pushTitle")}</h2>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                        {t("profile.alerts.pushDescription")}
                    </p>
                </div>

                <div className="shrink-0 flex items-center justify-start sm:justify-end">
                    {!isPushSupported ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {t("alerts.pushNotSupported")}
                        </span>
                    ) : checkingSubscription ? (
                        <div className="h-8 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-md" />
                    ) : isSubscribed ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-success flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t("profile.alerts.pushEnabled")}
                            </span>
                            <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-8"
                                onClick={handleUnsubscribe} 
                                disabled={actionLoading}
                            >
                                <BellOff className="h-4 w-4 mr-1.5" />
                                {t("profile.alerts.pushDisable")}
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={handleSubscribe} 
                            disabled={actionLoading}
                        >
                            <Bell className="h-4 w-4 mr-1.5" />
                            {t("profile.alerts.pushEnable")}
                        </Button>
                    )}
                </div>
            </div>

            {/* Configured Alerts List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{t("profile.alerts.configuredAlerts")}</h3>
                </div>
                
                {allAlerts.length === 0 ? (
                    <div className="py-12 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground">
                        <p className="text-sm">{t("profile.noAlertsGlobal")}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2.5">
                        {allAlerts.map((alert) => (
                            <div 
                                key={alert.id} 
                                className="group flex items-center justify-between p-4 bg-zinc-50/50 dark:bg-zinc-800/40 rounded-lg border border-border/80 transition-colors hover:bg-zinc-100/50 dark:hover:bg-zinc-800/60"
                            >
                                <div className="flex flex-col">
                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground mb-1">
                                        {t("profile.alertForServer")} : <strong className="text-foreground ml-1">{alert.serverName}</strong>
                                    </span>
                                    <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                        {t(`alerts.types.${alert.alert_type}`)}
                                    </span>
                                    {(alert.alert_type === "player_above" || alert.alert_type === "player_below") && (
                                        <span className="text-xs text-muted-foreground mt-1">
                                            {t("alerts.thresholdLabel")} : <strong className="text-foreground font-medium px-1.5 py-0.5 bg-zinc-200/50 dark:bg-zinc-700/50 rounded ml-1">{alert.player_threshold}</strong>
                                        </span>
                                    )}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                    title={t("profile.deleteAlert")}
                                    onClick={() => handleDeleteAlert(alert.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
