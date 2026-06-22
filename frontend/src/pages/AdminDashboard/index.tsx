import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAdmin } from "@/contexts/AdminContext"
import { fetchAdminUsers, fetchServers, toggleServerVisibility } from "@/lib/api"
import type { User, Server } from "@/lib/api"
import { Button } from "@/components/ui/button"
import logo from "@/assets/logo.png"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select"
import {
    Users,
    Server as ServerIcon,
    ShieldAlert,
    ArrowLeft,
    Info,
    RefreshCw,
    LayoutGrid,
    Activity,
    Settings,
    Menu,
    X,
    Globe
} from "lucide-react"

import { OverviewTab } from "@/components/AdminDashboard/OverviewTab"
import { UsersTab } from "@/components/AdminDashboard/UsersTab"
import { ServersTab } from "@/components/AdminDashboard/ServersTab"
import { LogsTab } from "@/components/AdminDashboard/LogsTab"
import { SettingsTab } from "@/components/AdminDashboard/SettingsTab"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

type ActiveTab = "overview" | "users" | "servers" | "logs" | "settings"

export function AdminDashboard() {
    const { t, language, setLanguage } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const { isAdmin, loadingAdmin } = useAdmin()
    const { subview } = useParams<{ subview?: string }>()
    const navigate = useNavigate()

    const getUserDisplayName = (user?: User | null) => {
        if (!user) return "Unknown"
        if (user.first_name) {
            return user.last_name ? `${user.first_name} ${user.last_name}` : user.first_name
        }
        return user.username || user.id
    }

    // Dashboard navigation & UI state
    const activeTab = useMemo(() => {
        const tab = subview || "overview"
        if (["overview", "users", "servers", "logs", "settings"].includes(tab)) {
            return tab as ActiveTab
        }
        return "overview"
    }, [subview])

    const setActiveTab = (tab: ActiveTab) => {
        navigate(`/dashboard/${tab}`)
    }

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    // Data states
    const [users, setUsers] = useState<User[]>([])
    const [servers, setServers] = useState<Server[]>([])

    // Mock states for proposed features
    const [maintenanceMode, setMaintenanceMode] = useState(false)
    const [rateLimiting, setRateLimiting] = useState(true)
    const [isCleaningDb, setIsCleaningDb] = useState(false)
    const [togglingServerId, setTogglingServerId] = useState<number | null>(null)

    // Log list state
    const [auditLogs, setAuditLogs] = useState<Array<{
        id: string
        timestamp: string
        action: string
        type: "create" | "visibility" | "signup" | "system"
        details: string
    }>>([
        { id: "log-1", timestamp: new Date(Date.now() - 120000).toISOString(), action: "New user registration", type: "signup", details: "flash303_test registered" },
        { id: "log-2", timestamp: new Date(Date.now() - 3600000).toISOString(), action: "Server created", type: "create", details: "Awesome Vanilla Server created by flash303" },
        { id: "log-3", timestamp: new Date(Date.now() - 7200000).toISOString(), action: "Database cleanup", type: "system", details: "Scheduled automatic cleaner cleared 15 records" },
    ])

    const [toastMessage, setToastMessage] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null)

    const loadData = useCallback(async () => {
        if (!isAdmin) return
        try {
            const token = await getToken()
            if (!token) return

            const [fetchedUsers, fetchedServers] = await Promise.all([
                fetchAdminUsers(token),
                fetchServers(token, false)
            ])

            setUsers(fetchedUsers)
            setServers(fetchedServers)
        } catch (error) {
            console.error("Failed to load admin console data:", error)
            setToastMessage({
                type: "error",
                text: t("common.error")
            })
        }
    }, [isAdmin, getToken, t])

    useEffect(() => {
        if (isLoaded && isAdmin) {
            loadData()
        }
    }, [isLoaded, isAdmin, loadData])

    // Trigger simulation toast helper
    const triggerToast = (type: "success" | "warning" | "error", text: string) => {
        setToastMessage({ type, text })
        setTimeout(() => setToastMessage(null), 5000)
    }

    // Toggle server visibility
    const handleToggleServer = async (serverId: number, currentHidden: boolean) => {
        const token = await getToken()
        if (!token) return

        setTogglingServerId(serverId)
        const targetServer = servers.find(s => s.id === serverId)
        const serverName = targetServer ? targetServer.name : `#${serverId}`

        try {
            const result = await toggleServerVisibility(serverId, token, !currentHidden)

            if (result.success) {
                setServers(prev => prev.map(s => s.id === serverId ? { ...s, hidden: !currentHidden } : s))
                triggerToast("success", t("admin.toast.visibilitySuccess", { name: serverName }))
                
                // Add to audit logs
                const newLog = {
                    id: `log-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    action: t("admin.toast.visibilityChanged"),
                    type: "visibility" as const,
                    details: t("admin.toast.visibilityDetails", { 
                        name: serverName, 
                        status: !currentHidden ? t("admin.toast.hidden") : t("admin.toast.visible") 
                    })
                }
                setAuditLogs(prev => [newLog, ...prev])
            } else {
                // Fallback simulation
                setServers(prev => prev.map(s => s.id === serverId ? { ...s, hidden: !currentHidden } : s))
                triggerToast("warning", t("admin.mockRouteWarning"))
                
                // Add to audit logs
                const newLog = {
                    id: `log-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    action: t("admin.toast.visibilityChangedSimulated"),
                    type: "visibility" as const,
                    details: t("admin.toast.visibilityDetailsSimulated", { 
                        name: serverName, 
                        status: !currentHidden ? t("admin.toast.hidden") : t("admin.toast.visible") 
                    })
                }
                setAuditLogs(prev => [newLog, ...prev])
            }
        } catch {
            // Fallback simulation on error
            setServers(prev => prev.map(s => s.id === serverId ? { ...s, hidden: !currentHidden } : s))
            triggerToast("warning", t("admin.mockRouteWarning"))
        } finally {
            setTogglingServerId(null)
        }
    }

    // Run database cleanup
    const handleRunDbCleanup = () => {
        setIsCleaningDb(true)
        setTimeout(() => {
            setIsCleaningDb(false)
            triggerToast("success", t("admin.auditLogs.dbCleanup"))
            const newLog = {
                id: `log-${Date.now()}`,
                timestamp: new Date().toISOString(),
                action: t("admin.settings.cleanup"),
                type: "system" as const,
                details: t("admin.auditLogs.dbCleanup")
            }
            setAuditLogs(prev => [newLog, ...prev])
        }, 1500)
    }

    // Toggle Maintenance mode
    const handleToggleMaintenance = () => {
        const nextState = !maintenanceMode
        setMaintenanceMode(nextState)
        triggerToast("warning", nextState ? t("admin.auditLogs.maintenanceEnabled") : t("admin.auditLogs.maintenanceDisabled"))
        
        const newLog = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: t("admin.settings.maintenance"),
            type: "system" as const,
            details: nextState ? t("admin.auditLogs.maintenanceEnabled") : t("admin.auditLogs.maintenanceDisabled")
        }
        setAuditLogs(prev => [newLog, ...prev])
    }

    // Toggle Rate Limit mode
    const handleToggleRateLimit = () => {
        const nextState = !rateLimiting
        setRateLimiting(nextState)
        triggerToast("success", t("admin.toast.rateLimitToggled", {
            status: nextState ? t("admin.toast.rateLimitEnabled") : t("admin.toast.rateLimitDisabled")
        }))
    }

    // 1. Loading Permissions Check
    if (!isLoaded || loadingAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-zinc-950">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground animate-pulse text-sm font-medium">
                    {t("admin.loading")}
                </p>
            </div>
        )
    }

    // 2. Unauthorized screen
    if (!isSignedIn || !isAdmin) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4">
                <div className="flex max-w-md w-full flex-col items-center justify-center gap-6 text-center bg-card p-8 rounded-2xl border shadow-lg">
                    <div className="rounded-full bg-destructive/15 p-4 text-destructive">
                        <ShieldAlert className="h-10 w-10" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            {t("admin.unauthorized")}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {t("admin.unauthorizedDesc")}
                        </p>
                    </div>
                    <Link to="/" className="w-full">
                        <Button className="w-full gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            {t("admin.backHome")}
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // 3. Authorized Console layout
    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 text-foreground flex flex-col md:flex-row font-sans">
            
            {/* Sidebar Navigation */}
            <aside className={`fixed md:sticky top-0 z-40 h-screen w-64 border-r bg-white dark:bg-zinc-900 flex flex-col flex-shrink-0 transition-transform duration-300 md:translate-x-0 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}>
                {/* Sidebar Header */}
                <div className="h-14 border-b px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="h-6 w-6 object-contain rounded-md" />
                        <span className="font-bold tracking-tight text-slate-900 dark:text-zinc-100 text-sm">
                            {t("header.title")} <span className="text-xs text-primary font-mono ml-0.5">Admin</span>
                        </span>
                    </Link>
                    <button 
                        onClick={() => setIsSidebarOpen(false)}
                        className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Sidebar Navigation Items */}
                <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto">
                    <button
                        onClick={() => { setActiveTab("overview"); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "overview" 
                                ? "bg-primary/10 text-primary dark:bg-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                        <LayoutGrid className="h-4.5 w-4.5" />
                        {t("admin.menu.overview")}
                    </button>

                    <button
                        onClick={() => { setActiveTab("users"); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "users" 
                                ? "bg-primary/10 text-primary dark:bg-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                        <Users className="h-4.5 w-4.5" />
                        {t("admin.menu.users")}
                    </button>

                    <button
                        onClick={() => { setActiveTab("servers"); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "servers" 
                                ? "bg-primary/10 text-primary dark:bg-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                        <ServerIcon className="h-4.5 w-4.5" />
                        {t("admin.menu.servers")}
                    </button>

                    <button
                        onClick={() => { setActiveTab("logs"); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "logs" 
                                ? "bg-primary/10 text-primary dark:bg-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                        <Activity className="h-4.5 w-4.5" />
                        {t("admin.menu.logs")}
                    </button>

                    <button
                        onClick={() => { setActiveTab("settings"); setIsSidebarOpen(false); }}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                            activeTab === "settings" 
                                ? "bg-primary/10 text-primary dark:bg-primary/20" 
                                : "text-muted-foreground hover:text-foreground hover:bg-slate-100/50 dark:hover:bg-zinc-800/40"
                        }`}
                    >
                        <Settings className="h-4.5 w-4.5" />
                        {t("admin.menu.settings")}
                    </button>
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t bg-slate-50/50 dark:bg-zinc-900/50">
                    <Link to="/">
                        <Button variant="ghost" size="sm" className="w-full gap-2 text-xs font-semibold justify-start">
                            <ArrowLeft className="h-3.5 w-3.5" />
                            {t("admin.backHome")}
                        </Button>
                    </Link>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-black/40 md:hidden backdrop-blur-xs"
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
                
                {/* Header panel */}
                <header className="sticky top-0 z-20 h-14 border-b bg-white/95 dark:bg-zinc-900/95 backdrop-blur flex items-center justify-between px-6 flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <h2 className="font-bold text-sm text-foreground capitalize hidden xs:block">
                            {t(`admin.menu.${activeTab}`)}
                        </h2>
                    </div>

                    {/* Right actions: Lang, Theme, Clerk user button */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Select value={language} onValueChange={(v: "fr" | "en") => setLanguage(v)}>
                                <SelectTrigger className="h-8 w-8 sm:w-[45px] px-0 border-none bg-transparent hover:bg-muted justify-center cursor-pointer">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent align="end">
                                    <SelectItem value="fr">FR</SelectItem>
                                    <SelectItem value="en">EN</SelectItem>
                                </SelectContent>
                            </Select>
                            
                            <ThemeToggle />
                        </div>
                    </div>
                </header>

                {/* Main page view scroll container */}
                <main className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto flex flex-col gap-6">
                    
                    {/* Simulation Alerts */}
                    {toastMessage && (
                        <div className={`flex items-start gap-3 p-4 rounded-xl border shadow-sm transition-all duration-300 ${
                            toastMessage.type === "success" 
                                ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" 
                                : toastMessage.type === "warning"
                                ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400"
                                : "bg-destructive/10 border-destructive/20 text-destructive"
                        }`}>
                            <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold uppercase tracking-wider">
                                    {toastMessage.type === "success" ? "Success" : toastMessage.type === "warning" ? "Simulation Alert" : "Error"}
                                </p>
                                <p className="text-sm mt-0.5 font-medium">{toastMessage.text}</p>
                            </div>
                            <button 
                                onClick={() => setToastMessage(null)} 
                                className="text-xs font-bold hover:underline opacity-80 hover:opacity-100 cursor-pointer"
                            >
                                Fermer
                            </button>
                        </div>
                    )}

                    {/* TAB VIEW CONTROLLERS */}

                    {/* 1. OVERVIEW VIEW */}
                    {activeTab === "overview" && (
                        <OverviewTab
                            users={users}
                            servers={servers}
                            t={t}
                        />
                    )}

                    {/* 2. USERS DIRECTORY VIEW */}
                    {activeTab === "users" && (
                        <UsersTab
                            users={users}
                            servers={servers}
                            togglingServerId={togglingServerId}
                            handleToggleServer={handleToggleServer}
                            getUserDisplayName={getUserDisplayName}
                            t={t}
                        />
                    )}

                    {/* 3. SERVERS MANAGEMENT VIEW */}
                    {activeTab === "servers" && (
                        <ServersTab
                            servers={servers}
                            users={users}
                            togglingServerId={togglingServerId}
                            handleToggleServer={handleToggleServer}
                            getUserDisplayName={getUserDisplayName}
                            t={t}
                            onRefresh={loadData}
                        />
                    )}

                    {/* 4. AUDIT LOGS VIEW */}
                    {activeTab === "logs" && (
                        <LogsTab
                            auditLogs={auditLogs}
                            t={t}
                        />
                    )}

                    {/* 5. SYSTEM SETTINGS VIEW */}
                    {activeTab === "settings" && (
                        <SettingsTab
                            maintenanceMode={maintenanceMode}
                            handleToggleMaintenance={handleToggleMaintenance}
                            rateLimiting={rateLimiting}
                            handleToggleRateLimit={handleToggleRateLimit}
                            isCleaningDb={isCleaningDb}
                            handleRunDbCleanup={handleRunDbCleanup}
                            t={t}
                        />
                    )}
                </main>
            </div>
        </div>
    )
}
