import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser } from "@clerk/react"
import { fetchMyServers, fetchAllUserAlerts, deleteAlert } from "@/core/lib/api"
import type { Server, Alert } from "@/core/lib/api"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { User, Server as ServerIcon, Bell, Settings } from "lucide-react"
import { useLocation, useNavigate } from "react-router"
import type { MetaFunction } from "react-router"

import { useWebPush } from "@/core/hooks/useWebPush"
import { AccountServersTab } from "./components/AccountServersTab"
import { AccountAlertsTab } from "./components/AccountAlertsTab"
import { AccountProfileTab } from "./components/AccountProfileTab"

export interface ExtendedAlert extends Alert {
    serverId: number
    serverName: string
}

export const meta: MetaFunction = () => {
    return [
        { title: "My Account | Minecraft-Stats" },
        { name: "robots", content: "noindex, nofollow" }
    ];
};

export default function Account() {
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

    // Web Push State from Custom Hook
    const { 
        isPushSupported, 
        isSubscribed, 
        checkingSubscription, 
        actionLoading, 
        checkSubscription, 
        handleSubscribe, 
        handleUnsubscribe 
    } = useWebPush(getToken)

    const loadData = useCallback(async () => {
        if (!isLoaded || !isSignedIn) return
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const data = await fetchMyServers(token, true)
                const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name))
                setServers(sortedData)

                const allAlertsData = await fetchAllUserAlerts(token)
                
                const mappedAlerts = allAlertsData.map(alert => {
                    const server = sortedData.find(s => s.id === alert.server_id)
                    return {
                        ...alert,
                        serverId: alert.server_id,
                        serverName: server ? server.name : "Unknown Server"
                    }
                })
                
                setAllAlerts(mappedAlerts)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [getToken, isLoaded, isSignedIn])

    useEffect(() => {
        if (isLoaded) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadData()
            checkSubscription()
        }
    }, [isLoaded, loadData, checkSubscription])

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
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                    <User className="h-16 w-16 text-muted-foreground/30" />
                    <p className="text-muted-foreground text-lg font-medium">{t("profile.unauthenticated")}</p>
                </div>
            </div>
        )
    }

    return (
        <>
            {/* Header section with gradient background */}
            <div className="relative overflow-hidden bg-white dark:bg-slate-950 border-b border-border">
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
                                <h1 className="text-3xl font-bold text-foreground tracking-tight">
                                    {t("profile.hello", { name: user?.firstName || user?.username || t("profile.defaultUser") })}
                                </h1>
                                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                                    {t("profile.loggedInAs", { email: user?.primaryEmailAddress?.emailAddress || "" })}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <div className="flex flex-col p-3 bg-background/80 backdrop-blur-sm rounded-xl border border-border/60 shadow-sm min-w-[120px]">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("profile.tabs.servers")}</span>
                                <span className="text-2xl font-bold text-primary">{servers.length}</span>
                            </div>
                            <div className="flex flex-col p-3 bg-background/80 backdrop-blur-sm rounded-xl border border-border/60 shadow-sm min-w-[120px]">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{t("profile.tabs.alerts")}</span>
                                <span className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">{allAlerts.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Minimalist Tabs */}
                <div className="flex flex-wrap items-center gap-6 border-b border-border mb-8 px-1">
                    <button
                        onClick={() => handleTabChange('servers')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'servers'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <ServerIcon className="h-4 w-4" />
                        {t("profile.tabs.servers")}
                        {activeTab === 'servers' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary text-primary-foreground rounded-t-full" />
                        )}
                    </button>
                    
                    <button
                        onClick={() => handleTabChange('alerts')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'alerts'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <Bell className="h-4 w-4" />
                        {t("profile.tabs.alerts")}
                        {activeTab === 'alerts' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary text-primary-foreground rounded-t-full" />
                        )}
                    </button>
                    
                    <button
                        onClick={() => handleTabChange('profile')}
                        className={`flex items-center gap-2.5 pb-3.5 text-sm font-medium transition-all relative cursor-pointer ${
                            activeTab === 'profile'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                    >
                        <Settings className="h-4 w-4" />
                        {t("profile.tabs.settings")}
                        {activeTab === 'profile' && (
                            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary text-primary-foreground rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'servers' && (
                        <AccountServersTab 
                            t={t} 
                            loading={loading} 
                            servers={servers} 
                            loadData={loadData} 
                        />
                    )}

                    {activeTab === 'alerts' && (
                        <AccountAlertsTab 
                            t={t}
                            isPushSupported={isPushSupported}
                            checkingSubscription={checkingSubscription}
                            isSubscribed={isSubscribed}
                            actionLoading={actionLoading}
                            handleSubscribe={handleSubscribe}
                            handleUnsubscribe={handleUnsubscribe}
                            allAlerts={allAlerts}
                            handleDeleteAlert={handleDeleteAlert}
                        />
                    )}

                    {activeTab === 'profile' && <AccountProfileTab />}
                </div>
            </div>
        </>
    )
}
