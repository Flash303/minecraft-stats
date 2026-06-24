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
                {/* Premium Tabs */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 dark:bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-slate-800/80 w-max mb-8">
                    <button
                        onClick={() => handleTabChange('servers')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'servers'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <ServerIcon className="h-4.5 w-4.5" />
                        Mes Serveurs
                    </button>
                    <button
                        onClick={() => handleTabChange('alerts')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'alerts'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <Bell className="h-4.5 w-4.5" />
                        Alertes
                    </button>
                    <button
                        onClick={() => handleTabChange('profile')}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === 'profile'
                                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
                                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50"
                        }`}
                    >
                        <Settings className="h-4.5 w-4.5" />
                        Paramètres
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'servers' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Vos serveurs suivis</h2>
                                    <p className="text-muted-foreground mt-1 text-sm">Gérez les serveurs Minecraft que vous avez ajoutés à vos favoris.</p>
                                </div>
                            </div>
                            
                            {servers.length === 0 ? (
                                <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-900/20 flex flex-col items-center justify-center">
                                    <ServerIcon className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Aucun serveur</h3>
                                    <p className="text-muted-foreground mt-1 max-w-sm">Vous n'avez pas encore ajouté de serveur à votre liste. Recherchez un serveur pour l'ajouter.</p>
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
                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-6 sm:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex gap-4 items-start">
                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl shrink-0 text-indigo-600 dark:text-indigo-400">
                                            <Activity className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Notifications Push</h2>
                                            <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-xl text-sm leading-relaxed">
                                                Activez les notifications pour recevoir des alertes en temps réel lorsque vos serveurs dépassent ou passent sous certains seuils de joueurs, même quand le site est fermé.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="shrink-0 flex items-center justify-start md:justify-end">
                                        {!isPushSupported ? (
                                            <span className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 flex items-center gap-2 font-medium">
                                                <ShieldAlert className="h-4.5 w-4.5" />
                                                Non supporté par le navigateur
                                            </span>
                                        ) : checkingSubscription ? (
                                            <div className="h-10 w-32 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
                                        ) : isSubscribed ? (
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                <span className="text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 dark:text-emerald-400 rounded-lg px-4 py-2 flex items-center gap-2 font-semibold">
                                                    <CheckCircle2 className="h-4.5 w-4.5" />
                                                    Activé
                                                </span>
                                                <Button 
                                                    variant="outline" 
                                                    className="text-rose-500 hover:text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/20 h-10 px-4 cursor-pointer"
                                                    onClick={handleUnsubscribe} 
                                                    disabled={actionLoading}
                                                >
                                                    <BellOff className="h-4 w-4 mr-2" />
                                                    Désactiver
                                                </Button>
                                            </div>
                                        ) : (
                                            <Button 
                                                className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 px-6 cursor-pointer shadow-md shadow-indigo-600/20"
                                                onClick={handleSubscribe} 
                                                disabled={actionLoading}
                                            >
                                                <Bell className="h-4.5 w-4.5 mr-2 animate-bounce" />
                                                Activer les notifications
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Règles d'alerte configurées</h3>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-full text-xs font-semibold">
                                        {allAlerts.length} totale{allAlerts.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                
                                {allAlerts.length === 0 ? (
                                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-white dark:bg-slate-900/20">
                                        <Bell className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-4" />
                                        <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">Aucune alerte configurée</h4>
                                        <p className="text-muted-foreground mt-1">Allez sur la page d'un serveur pour configurer de nouvelles alertes.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {allAlerts.map((alert) => (
                                            <div 
                                                key={alert.id} 
                                                className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-1 rounded">
                                                            {alert.serverName}
                                                        </span>
                                                        <button 
                                                            className="text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-1"
                                                            title="Supprimer"
                                                            onClick={() => handleDeleteAlert(alert.id)}
                                                        >
                                                            <Trash2 className="h-4.5 w-4.5" />
                                                        </button>
                                                    </div>
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                                                            {alert.alert_type === 'player_above' ? <Activity className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                                                        </div>
                                                        <h4 className="font-semibold text-slate-900 dark:text-white">
                                                            {t(`alerts.types.${alert.alert_type}`)}
                                                        </h4>
                                                    </div>
                                                    {(alert.alert_type === "player_above" || alert.alert_type === "player_below") && (
                                                        <p className="text-sm text-slate-600 dark:text-slate-400 pl-[44px]">
                                                            Seuil défini à <strong className="text-slate-900 dark:text-white">{alert.player_threshold}</strong> joueurs
                                                        </p>
                                                    )}
                                                </div>
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
