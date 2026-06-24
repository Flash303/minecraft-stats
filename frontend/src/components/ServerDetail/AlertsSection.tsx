import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/react"
import { Bell, BellOff, Plus, Trash2, ShieldAlert, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fetchAlerts, createAlert, deleteAlert, fetchVapidKey, subscribeDevice, unsubscribeDevice, type Alert } from "@/lib/api"

interface AlertsSectionProps {
    serverId: number
    t: (key: string) => string
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function AlertsSection({ serverId, t }: AlertsSectionProps) {
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [loading, setLoading] = useState(true)
    
    // Web Push State
    const isPushSupported = "serviceWorker" in navigator && "PushManager" in window
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [checkingSubscription, setCheckingSubscription] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

    // Form State
    const [alertType, setAlertType] = useState<"status_to_offline" | "status_to_online" | "player_above" | "player_below">("status_to_offline")
    const [threshold, setThreshold] = useState<string>("")

    const checkSubscription = useCallback(async () => {
        if (!isPushSupported) {
            setCheckingSubscription(false)
            return
        }
        try {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            setIsSubscribed(!!subscription)
        } catch (e) {
            console.error("Error checking push subscription:", e)
        } finally {
            setCheckingSubscription(false)
        }
    }, [isPushSupported])

    const loadAlerts = useCallback(async () => {
        if (!isSignedIn || !isLoaded) return
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const data = await fetchAlerts(serverId, token)
                setAlerts(data)
            }
        } catch (error) {
            console.error("Error loading alerts:", error)
        } finally {
            setLoading(false)
        }
    }, [serverId, getToken, isSignedIn, isLoaded])

    useEffect(() => {
        if (isLoaded) {
            loadAlerts()
            checkSubscription()
        }
    }, [loadAlerts, checkSubscription, isLoaded])

    const handleSubscribe = async () => {
        if (!isPushSupported) return
        setActionLoading(true)
        try {
            const token = await getToken()
            if (!token) {
                setActionLoading(false)
                return
            }

            const vapidKey = await fetchVapidKey()
            if (!vapidKey) {
                alert("Failed to load VAPID public key from backend.")
                setActionLoading(false)
                return
            }

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidKey)
            })

            const p256dh = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('p256dh')!))))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
            const auth = btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(subscription.getKey('auth')!))))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const success = await subscribeDevice({
                endpoint: subscription.endpoint,
                p256dh,
                auth
            }, token)

            if (success) {
                setIsSubscribed(true)
            } else {
                alert("Failed to sync subscription details with backend.")
            }
        } catch (e) {
            console.error("Push registration failed:", e)
            alert(`Subscription failed: ${e}`)
        } finally {
            setActionLoading(false)
        }
    }

    const handleUnsubscribe = async () => {
        if (!isPushSupported) return
        setActionLoading(true)
        try {
            const token = await getToken()
            if (!token) {
                setActionLoading(false)
                return
            }

            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            if (subscription) {
                await subscription.unsubscribe()
                await unsubscribeDevice(subscription.endpoint, token)
                setIsSubscribed(false)
            }
        } catch (e) {
            console.error("Unsubscription failed:", e)
            alert(`Unsubscription failed: ${e}`)
        } finally {
            setActionLoading(false)
        }
    }

    const handleAddAlert = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!isSignedIn) return

        const token = await getToken()
        if (!token) return

        const playerThreshold = (alertType === "player_above" || alertType === "player_below")
            ? parseInt(threshold, 10)
            : null

        if (playerThreshold !== null && (isNaN(playerThreshold) || playerThreshold < 0)) {
            alert("Please enter a valid player threshold.")
            return
        }

        const newAlert = await createAlert(
            serverId,
            { alert_type: alertType, player_threshold: playerThreshold },
            token
        )

        if (newAlert) {
            setAlerts(prev => [...prev, newAlert])
            setThreshold("")
        } else {
            alert("Failed to create alert.")
        }
    }

    const handleDeleteAlert = async (alertId: number) => {
        const token = await getToken()
        if (!token) return

        const success = await deleteAlert(alertId, token)
        if (success) {
            setAlerts(prev => prev.filter(a => a.id !== alertId))
        } else {
            alert("Failed to delete alert.")
        }
    }

    if (!isLoaded) return null

    if (!isSignedIn) {
        return (
            <div className="mt-8 border border-dashed rounded-xl p-8 flex flex-col items-center text-center">
                <ShieldAlert className="h-6 w-6 text-slate-400 mb-3" />
                <h3 className="font-medium text-slate-800 dark:text-slate-200">{t("alerts.title")}</h3>
                <p className="text-sm text-muted-foreground mt-1">{t("alerts.unauthenticated")}</p>
            </div>
        )
    }

    return (
        <div className="mt-8 flex flex-col gap-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("alerts.title")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t("alerts.description")}</p>
                </div>

                <div className="flex items-center gap-3">
                    {!isPushSupported ? (
                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {t("alerts.pushNotSupported")}
                        </span>
                    ) : checkingSubscription ? (
                        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
                    ) : isSubscribed ? (
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t("alerts.pushEnabled")}
                            </span>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 h-8"
                                onClick={handleUnsubscribe} 
                                disabled={actionLoading}
                            >
                                <BellOff className="h-4 w-4 mr-1.5" />
                                Désactiver
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
                            {t("alerts.enablePush")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Alert Creation Form */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-200">Ajouter une règle</h4>
                    <form onSubmit={handleAddAlert} className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="alert-type" className="text-xs text-muted-foreground">{t("alerts.typeLabel")}</Label>
                            <select 
                                id="alert-type"
                                value={alertType}
                                onChange={(e) => setAlertType(e.target.value as any)}
                                className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 dark:border-slate-800 dark:focus-visible:ring-slate-300"
                            >
                                <option value="status_to_offline">{t("alerts.types.status_to_offline")}</option>
                                <option value="status_to_online">{t("alerts.types.status_to_online")}</option>
                                <option value="player_above">{t("alerts.types.player_above")}</option>
                                <option value="player_below">{t("alerts.types.player_below")}</option>
                            </select>
                        </div>

                        {(alertType === "player_above" || alertType === "player_below") && (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label htmlFor="threshold" className="text-xs text-muted-foreground">{t("alerts.thresholdLabel")}</Label>
                                <Input 
                                    id="threshold"
                                    type="number"
                                    min="0"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                    placeholder="Ex: 10"
                                    className="h-9"
                                    required
                                />
                            </div>
                        )}

                        <Button type="submit" size="sm" className="w-full mt-2 h-9">
                            <Plus className="h-4 w-4 mr-1.5" />
                            {t("alerts.addAlert")}
                        </Button>
                    </form>
                </div>

                {/* Active Alerts List */}
                <div className="flex flex-col gap-4">
                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-200">Règles actives</h4>
                    
                    {loading ? (
                        <div className="flex flex-col gap-3">
                            <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-md animate-pulse" />
                            <div className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-md animate-pulse" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-lg">
                            <p className="text-sm">{t("alerts.noAlerts")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="group flex items-center justify-between p-3.5 bg-slate-50/50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800/80 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/60">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                            {t(`alerts.types.${alert.alert_type}`)}
                                        </span>
                                        {(alert.alert_type === "player_above" || alert.alert_type === "player_below") && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                                {t("alerts.thresholdLabel")} : <strong className="text-slate-900 dark:text-slate-100 font-medium px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-700/50 rounded">{alert.player_threshold}</strong>
                                            </span>
                                        )}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
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
        </div>
    )
}
