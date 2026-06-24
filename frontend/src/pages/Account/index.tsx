import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser, UserProfile } from "@clerk/react"
import { fetchMyServers, renameServer, fetchAlerts, deleteAlert, fetchVapidKey, subscribeDevice, unsubscribeDevice } from "@/lib/api"
import type { Server, Alert } from "@/lib/api"
import { Layout } from "@/components/layout"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { useLanguage } from "@/contexts/LanguageContext"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Edit2, Server as ServerIcon, Bell, BellOff, Trash2, ShieldAlert, CheckCircle2, User, Activity, Settings } from "lucide-react"
import { useLocation, useNavigate } from "react-router-dom"

interface ExtendedAlert extends Alert {
    serverId: number
    serverName: string
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

export function Account() {
    const { t } = useLanguage()
    const { user, isLoaded, isSignedIn } = useUser()
    const { getToken } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    
    // Check if URL has /servers or /alerts
    const isServersPath = location.pathname.includes('/servers')
    const isAlertsPath = location.pathname.includes('/alerts')
    const activeTab = isServersPath ? 'servers' : isAlertsPath ? 'alerts' : 'profile'

    const handleTabChange = (tab: 'profile' | 'servers' | 'alerts') => {
        if (tab === 'profile') navigate('/account')
        else navigate(`/account/${tab}`)
    }

    const [servers, setServers] = useState<Server[]>([])
    const [allAlerts, setAllAlerts] = useState<ExtendedAlert[]>([])
    const [loading, setLoading] = useState(true)

    // Web Push State
    const isPushSupported = "serviceWorker" in navigator && "PushManager" in window
    const [isSubscribed, setIsSubscribed] = useState(false)
    const [checkingSubscription, setCheckingSubscription] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)

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

    const loadData = useCallback(async () => {
        if (!isLoaded || !isSignedIn) return
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const data = await fetchMyServers(token, true)
                const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name))
                setServers(sortedData)

                const alertsPromises = sortedData.map(async (server) => {
                    const alertsData = await fetchAlerts(server.id, token)
                    return alertsData.map(alert => ({
                        ...alert,
                        serverId: server.id,
                        serverName: server.name
                    }))
                })
                const results = await Promise.all(alertsPromises)
                setAllAlerts(results.flat())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [getToken, isLoaded, isSignedIn])

    useEffect(() => {
        if (isLoaded) {
            loadData()
            checkSubscription()
        }
    }, [isLoaded, loadData, checkSubscription])

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

    const handleDeleteAlert = async (alertId: number) => {
        const token = await getToken()
        if (!token) return

        const success = await deleteAlert(alertId, token)
        if (success) {
            setAllAlerts(prev => prev.filter(a => a.id !== alertId))
        } else {
            alert("Failed to delete alert.")
        }
    }

    if (!isSignedIn && isLoaded) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-[60vh]">
                    <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                        <User className="h-16 w-16 text-muted-foreground/30" />
                        <p className="text-muted-foreground text-lg font-medium">Vous devez être connecté pour accéder à votre espace.</p>
                    </div>
                </div>
            </Layout>
        )
    }

    return (
        <Layout isLoading={loading && servers.length === 0} onRefresh={loadData}>
            {/* Header section with gradient background */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
                <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt="Avatar" className="w-20 h-20 rounded-full border-4 border-background shadow-md" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-4 border-background shadow-md">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                                    Bonjour, {user?.firstName || user?.username || "Utilisateur"}
                                </h1>
                                <p className="text-slate-500 dark:text-zinc-400 mt-1 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                    Connecté en tant que {user?.primaryEmailAddress?.emailAddress}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex flex-col p-3 bg-background/80 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm min-w-[120px]">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Serveurs</span>
                                <span className="text-2xl font-bold text-primary">{servers.length}</span>
                            </div>
                            <div className="flex flex-col p-3 bg-background/80 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-800 shadow-sm min-w-[120px]">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alertes</span>
                                <span className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">{allAlerts.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Minimalist Tabs */}
                <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 dark:border-slate-800 mb-8 px-1">
                    <button
                        onClick={() => handleTabChange('servers')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'servers'
                                ? "text-slate-900 dark:text-white"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <ServerIcon className="h-4 w-4" />
                        {t("profile.tabs.servers")}
                        {activeTab === 'servers' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t-full" />
                        )}
                    </button>
                    
                    <button
                        onClick={() => handleTabChange('alerts')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'alerts'
                                ? "text-slate-900 dark:text-white"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        {t("profile.tabs.alerts")}
                        {activeTab === 'alerts' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t-full" />
                        )}
                    </button>
                    
                    <button
                        onClick={() => handleTabChange('profile')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'profile'
                                ? "text-slate-900 dark:text-white"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <Settings className="h-4 w-4" />
                        {t("profile.tabs.settings")}
                        {activeTab === 'profile' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 dark:bg-white rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'servers' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("profile.servers.title")}</h2>
                                    <p className="text-muted-foreground mt-1 text-sm">{t("profile.servers.description")}</p>
                                </div>
                            </div>
                            
                            {servers.length === 0 ? (
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
                    )}

                    {activeTab === 'alerts' && (
                        <div className="space-y-8 max-w-4xl">
                            {/* Push Settings */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("profile.alerts.pushTitle")}</h2>
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
                                        <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-md" />
                                    ) : isSubscribed ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
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
                                    <h3 className="text-sm font-medium text-slate-900 dark:text-slate-200">{t("profile.alerts.configuredAlerts")}</h3>
                                </div>
                                
                                {allAlerts.length === 0 ? (
                                    <div className="py-12 border-2 border-dashed border-slate-100 dark:border-slate-800/60 rounded-xl flex flex-col items-center justify-center text-center text-muted-foreground">
                                        <p className="text-sm">{t("profile.noAlertsGlobal")}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2.5">
                                        {allAlerts.map((alert) => (
                                            <div 
                                                key={alert.id} 
                                                className="group flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-800/40 rounded-lg border border-slate-200/60 dark:border-slate-800/80 transition-colors hover:bg-slate-100/50 dark:hover:bg-slate-800/60"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                                                        {t("profile.alertForServer")} : <strong className="text-slate-900 dark:text-slate-100 ml-1">{alert.serverName}</strong>
                                                    </span>
                                                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                        {t(`alerts.types.${alert.alert_type}`)}
                                                    </span>
                                                    {(alert.alert_type === "player_above" || alert.alert_type === "player_below") && (
                                                        <span className="text-xs text-muted-foreground mt-1">
                                                            {t("alerts.thresholdLabel")} : <strong className="text-slate-900 dark:text-slate-100 font-medium px-1.5 py-0.5 bg-slate-200/50 dark:bg-slate-700/50 rounded ml-1">{alert.player_threshold}</strong>
                                                        </span>
                                                    )}
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
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
                    )}

                    {activeTab === 'profile' && (
                        <div className="flex justify-center w-full min-h-[600px]">
                            {/* We just render UserProfile. Clerk handles the width, we give it full width container. */}
                            <UserProfile 
                                routing="hash" 
                                appearance={{ 
                                    elements: { 
                                        rootBox: "w-full max-w-4xl mx-auto",
                                        cardBox: "w-full shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950"
                                    } 
                                }} 
                            />
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    )
}

function RenameServerModal({ server, onSuccess }: { server: Server, onSuccess: () => void }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const res = await renameServer(server.id, name, token)
                if (res.success) {
                    setOpen(false)
                    onSuccess()
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer text-slate-500">
                    <Edit2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Renommer le serveur</DialogTitle>
                    <DialogDescription>
                        Entrez le nouveau nom de votre serveur.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
