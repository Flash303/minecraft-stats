import { useState, useEffect, useCallback } from "react"
import { useAuth, useUser } from "@clerk/react"
import { fetchMyServers, fetchAllUserAlerts, deleteAlert } from "@/core/lib/api"
import type { Server, Alert } from "@/core/lib/api"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { User, Server as ServerIcon, Bell, Settings } from "lucide-react"
import { useLocation, useNavigate } from "react-router"
import type { MetaFunction } from "react-router"
import { resolveMetaLanguage, siteTitle } from "@/core/lib/seo-meta"

import { useWebPush } from "@/core/hooks/useWebPush"
import { useToast } from "@/core/hooks/useToast"
import { useInvalidateServers } from "@/core/hooks/useInvalidateServers"
import { AccountServersTab } from "./components/AccountServersTab"
import { AccountAlertsTab } from "./components/AccountAlertsTab"
import { AccountProfileTab } from "./components/AccountProfileTab"
import { PageContainer } from "@/ui/layout/PageContainer"

export interface ExtendedAlert extends Alert {
    serverId: number
    serverName: string
}

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    return [
        { title: siteTitle(lang, "common.mySpace") },
        { name: "robots", content: "noindex, nofollow" }
    ]
}

export default function Account() {
    const { t } = useLanguage()
    const { showToast } = useToast()
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
    const invalidateServers = useInvalidateServers()

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

    // After a rename: reload "my servers" AND invalidate the global cache so
    // the home page and Ctrl+K show the new name.
    const handleServersMutated = useCallback(() => {
        loadData()
        invalidateServers()
    }, [loadData, invalidateServers])

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
            showToast("success", t("alerts.deleteSuccess"))
        } else {
            showToast("error", t("alerts.deleteError"))
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
            <div className="relative overflow-hidden bg-card border-b border-border">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 opacity-50" />
                <PageContainer className="relative z-10 pt-8 pb-10 sm:pt-10 sm:pb-12">
                    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
                            {user?.imageUrl ? (
                                <img src={user.imageUrl} alt="Avatar" loading="lazy" decoding="async" className="h-16 w-16 shrink-0 rounded-full border-4 border-background shadow-md sm:h-20 sm:w-20" />
                            ) : (
                                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary/10 shadow-md sm:h-20 sm:w-20">
                                    <User className="h-8 w-8 text-primary" />
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground break-words sm:text-3xl">
                                    {t("profile.hello", { name: user?.firstName || user?.username || t("profile.defaultUser") })}
                                </h1>
                                <p className="mt-1 flex items-start gap-2 text-sm text-muted-foreground break-words">
                                    <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-success" />
                                    <span className="min-w-0">{t("profile.loggedInAs", { email: user?.primaryEmailAddress?.emailAddress || "" })}</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 sm:flex sm:gap-4">
                            <div className="flex min-w-0 flex-col rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm sm:min-w-[120px]">
                                <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("profile.tabs.servers")}</span>
                                <span className="text-2xl font-bold text-primary">{servers.length}</span>
                            </div>
                            <div className="flex min-w-0 flex-col rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm backdrop-blur-sm sm:min-w-[120px]">
                                <span className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("profile.tabs.alerts")}</span>
                                <span className="text-2xl font-bold text-primary">{allAlerts.length}</span>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </div>

            <PageContainer className="py-8">
                {/* Minimalist Tabs */}
                <div className="mb-8 flex items-center gap-4 overflow-x-auto border-b border-border px-1 sm:gap-6">
                    <button
                        onClick={() => handleTabChange('servers')}
                        className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap pb-3.5 text-sm font-medium transition-all cursor-pointer ${
                            activeTab === 'servers'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
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
                        className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap pb-3.5 text-sm font-medium transition-all cursor-pointer ${
                            activeTab === 'alerts'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
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
                        className={`relative flex shrink-0 items-center gap-2.5 whitespace-nowrap pb-3.5 text-sm font-medium transition-all cursor-pointer ${
                            activeTab === 'profile'
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
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
                            loadData={handleServersMutated} 
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
            </PageContainer>
        </>
    )
}
