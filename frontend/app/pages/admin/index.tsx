import { useState, useEffect, useCallback, useMemo } from "react"
import { Link, useNavigate, useParams } from "react-router"
import type { MetaFunction } from "react-router"
import { useAuth } from "@clerk/react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useAdmin } from "@/core/contexts/AdminContext"
import { useToast } from "@/core/contexts/ToastContext"
import { fetchAdminUsers, fetchServers, toggleServerVisibility } from "@/core/lib/api"
import type { User, Server } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { cn } from "@/core/lib/utils"
import logo from "@/assets/logo.webp"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/ui/components/select"
import {
    Users,
    Server as ServerIcon,
    ShieldAlert,
    ArrowLeft,
    RefreshCw,
    LayoutGrid,
    Menu,
    X,
    Globe
} from "lucide-react"

import { OverviewTab } from "@/pages/admin/components/OverviewTab"
import { UsersTab } from "@/pages/admin/components/UsersTab"
import { ServersTab } from "@/pages/admin/components/ServersTab"
import { ThemeToggle } from "@/ui/layout/ThemeToggle"

type ActiveTab = "overview" | "users" | "servers"

export const meta: MetaFunction = () => {
    return [
        { title: "Admin Dashboard | Minecraft-Stats" },
        { name: "robots", content: "noindex, nofollow" }
    ];
};

export default function AdminDashboard() {
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
        if (["overview", "users", "servers"].includes(tab)) {
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
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
    const [togglingServerId, setTogglingServerId] = useState<number | null>(null)

    const { showToast: triggerToast } = useToast()

    const loadData = useCallback(async () => {
        if (!isAdmin) return
        setIsLoadingData(true)
        try {
            const token = await getToken()
            if (!token) return

            const [fetchedUsers, fetchedServers] = await Promise.all([
                fetchAdminUsers(token),
                fetchServers(token, false)
            ])

            setUsers(fetchedUsers)
            setServers(fetchedServers)
            setLastUpdated(new Date())
        } catch (error) {
            console.error("Failed to load admin console data:", error)
            triggerToast("error", t("common.error"))
        } finally {
            setIsLoadingData(false)
        }
    }, [isAdmin, getToken, t, triggerToast])

    useEffect(() => {
        if (isLoaded && isAdmin) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            loadData()
        }
    }, [isLoaded, isAdmin, loadData])

    // Toggle server visibility (state updated only after confirmed API success)
    const handleToggleServer = async (serverId: number, currentHidden: boolean) => {
        const token = await getToken()
        if (!token) return

        setTogglingServerId(serverId)
        const serverName = servers.find(s => s.id === serverId)?.name ?? `#${serverId}`

        try {
            const result = await toggleServerVisibility(serverId, token, !currentHidden)

            if (result.success) {
                setServers(prev => prev.map(s => s.id === serverId ? { ...s, hidden: !currentHidden } : s))
                triggerToast("success", t("admin.toast.visibilitySuccess", { name: serverName }))
            } else {
                triggerToast("error", result.message_key ? t(result.message_key) : result.message || t("common.error"))
            }
        } catch {
            triggerToast("error", t("common.error"))
        } finally {
            setTogglingServerId(null)
        }
    }

    // 1. Loading Permissions Check
    if (!isLoaded || loadingAdmin) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
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
            <div className="flex min-h-screen items-center justify-center bg-background px-4">
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
    const navItems: Array<{ id: ActiveTab; labelKey: string; icon: typeof LayoutGrid }> = [
        { id: "overview", labelKey: "admin.menu.overview", icon: LayoutGrid },
        { id: "users", labelKey: "admin.menu.users", icon: Users },
        { id: "servers", labelKey: "admin.menu.servers", icon: ServerIcon },
    ]

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans">

            {/* Sidebar Navigation */}
            <aside className={`fixed md:sticky top-0 z-40 h-screen w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex flex-col flex-shrink-0 transition-transform duration-300 md:translate-x-0 ${
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}>
                {/* Sidebar Header */}
                <div className="h-14 border-b px-6 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="Logo" decoding="async" className="h-6 w-6 object-contain rounded-md" />
                        <span className="font-bold tracking-tight text-foreground text-sm">
                            {t("header.title")} <span className="text-xs text-primary font-mono ml-0.5">Admin</span>
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label={t("admin.close")}
                        className="md:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Sidebar Navigation Items */}
                <nav className="flex-1 px-4 py-6 flex flex-col gap-1 overflow-y-auto" aria-label="Dashboard sections">
                    <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                        {t("admin.title")}
                    </p>
                    {navItems.map((item) => {
                        const isActive = activeTab === item.id
                        return (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
                                aria-current={isActive ? "page" : undefined}
                                className={cn(
                                    "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer",
                                    isActive
                                        ? "bg-primary/10 text-primary dark:bg-primary/20"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                )}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-primary" aria-hidden />
                                )}
                                <item.icon className="h-4.5 w-4.5" />
                                {t(item.labelKey)}
                            </button>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t bg-background/50">
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
                    aria-hidden
                    className="fixed inset-0 z-30 bg-black/40 md:hidden backdrop-blur-xs"
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">

                {/* Header panel */}
                <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur flex items-center justify-between px-6 flex-shrink-0 shadow-xs gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            type="button"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label={t("admin.openMenu")}
                            className="md:hidden h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer transition-colors"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <h2 className="font-bold text-sm text-foreground truncate hidden xs:block capitalize">
                            {t(`admin.menu.${activeTab}`)}
                        </h2>
                    </div>

                    {/* Right actions: Refresh, last update, Lang, Theme */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {lastUpdated && (
                            <span className="hidden lg:block text-xs text-muted-foreground font-medium whitespace-nowrap">
                                {t("admin.updatedAt", { time: lastUpdated.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit" }) })}
                            </span>
                        )}

                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5 text-xs"
                            onClick={() => loadData()}
                            disabled={isLoadingData}
                            aria-label={t("admin.refresh")}
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", isLoadingData && "animate-spin")} />
                            <span className="hidden sm:inline">{t("admin.refresh")}</span>
                        </Button>

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
                </header>

                {/* Main page view scroll container */}
                <main className="flex-1 p-6 md:p-8 w-full max-w-6xl mx-auto flex flex-col gap-6">

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
                            triggerToast={triggerToast}
                        />
                    )}
                </main>
            </div>
        </div>
    )
}
