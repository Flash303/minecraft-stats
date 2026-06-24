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
            <div className="bg-card dark:bg-slate-900/25 border rounded-xl p-6 shadow-xs flex flex-col gap-3 items-center text-center">
                <ShieldAlert className="h-8 w-8 text-amber-500" />
                <h3 className="font-semibold text-slate-800 dark:text-white">{t("alerts.title")}</h3>
                <p className="text-sm text-muted-foreground">{t("alerts.unauthenticated")}</p>
            </div>
        )
    }

    return (
        <div className="bg-card dark:bg-slate-900/25 border rounded-xl p-6 shadow-xs flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">{t("alerts.title")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{t("alerts.description")}</p>
                </div>

                <div className="flex items-center gap-2">
                    {!isPushSupported ? (
                        <span className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-medium">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {t("alerts.pushNotSupported")}
                        </span>
                    ) : checkingSubscription ? (
                        <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                    ) : isSubscribed ? (
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                            <span className="text-xs text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 dark:text-emerald-450 rounded-lg px-3 py-1.5 flex items-center gap-1.5 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t("alerts.pushEnabled")}
                            </span>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 text-rose-500 hover:text-rose-600 dark:text-rose-450"
                                onClick={handleUnsubscribe} 
                                disabled={actionLoading}
                            >
                                <BellOff className="h-4 w-4 mr-1.5" />
                                Désactiver
                            </Button>
                        </div>
                    ) : (
                        <Button 
                            size="sm" 
                            className="bg-primary hover:bg-primary/95 text-white"
                            onClick={handleSubscribe} 
                            disabled={actionLoading}
                        >
                            <Bell className="h-4 w-4 mr-1.5 animate-bounce" />
                            {t("alerts.enablePush")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
                {/* Alert Creation Form */}
                <form onSubmit={handleAddAlert} className="lg:col-span-5 flex flex-col gap-4 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border border-slate-200/60 dark:border-slate-850">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="alert-type">{t("alerts.typeLabel")}</Label>
                        <select 
                            id="alert-type"
                            value={alertType}
                            onChange={(e) => setAlertType(e.target.value as any)}
                            className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-primary dark:border-slate-800"
                        >
                            <option value="status_to_offline">{t("alerts.types.status_to_offline")}</option>
                            <option value="status_to_online">{t("alerts.types.status_to_online")}</option>
                            <option value="player_above">{t("alerts.types.player_above")}</option>
                            <option value="player_below">{t("alerts.types.player_below")}</option>
                        </select>
                    </div>

                    {(alertType === "player_above" || alertType === "player_below") && (
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="threshold">{t("alerts.thresholdLabel")}</Label>
                            <Input 
                                id="threshold"
                                type="number"
                                min="0"
                                value={threshold}
                                onChange={(e) => setThreshold(e.target.value)}
                                placeholder="10"
                                required
                            />
                        </div>
                    )}

                    <Button type="submit" className="w-full mt-2">
                        <Plus className="h-4 w-4 mr-1.5" />
                        {t("alerts.addAlert")}
                    </Button>
                </form>

                {/* Active Alerts List */}
                <div className="lg:col-span-7 flex flex-col gap-3">
                    {loading ? (
                        <div className="flex flex-col gap-2">
                            <div className="h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg animate-pulse" />
                            <div className="h-12 bg-slate-100 dark:bg-slate-900/30 rounded-lg animate-pulse" />
                        </div>
                    ) : alerts.length === 0 ? (
                        <div className="border border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <Bell className="h-8 w-8 opacity-40 mb-2" />
                            <p className="text-sm">{t("alerts.noAlerts")}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                            {alerts.map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800/80 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-slate-800 dark:text-white">
                                            {t(`alerts.types.${alert.alert_type}`)}
                                        </span>
                                        {(alert.alert_type === "player_above" || alert.alert_type === "player_below") && (
                                            <span className="text-xs text-muted-foreground mt-0.5">
                                                {t("alerts.thresholdLabel")} : <strong className="text-primary">{alert.player_threshold}</strong>
                                            </span>
                                        )}
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg"
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
