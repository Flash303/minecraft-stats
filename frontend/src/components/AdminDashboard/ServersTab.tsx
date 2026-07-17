import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import type { User, Server } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Search,
    ArrowUp,
    ArrowDown,
    Server as ServerIcon,
    User as UserIcon,
    Eye,
    EyeOff,
    Edit2,
    Trash2
} from "lucide-react"
import { useAuth } from "@clerk/react"
import { renameServer, deleteServer, toggleServerVisibility } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface ServersTabProps {
    servers: Server[]
    users: User[]
    togglingServerId: number | null
    handleToggleServer: (serverId: number, currentHidden: boolean) => Promise<void>
    getUserDisplayName: (user?: User | null) => string
    t: (key: string, replacements?: Record<string, string>) => string
    onRefresh: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
}

export function ServersTab({
    servers,
    users,
    togglingServerId,
    handleToggleServer,
    getUserDisplayName,
    t,
    onRefresh,
    triggerToast
}: ServersTabProps) {
    const [serverSearchQuery, setServerSearchQuery] = useState("")
    const [serverStatusFilter, setServerStatusFilter] = useState<"all" | "online" | "offline" | "hidden">("all")
    const [sortField, setSortField] = useState<"name" | "creator" | "ip" | "status" | "players">("name")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

    const { getToken } = useAuth()
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const [isBulkLoading, setIsBulkLoading] = useState(false)

    const handleBulkVisibility = async (hide: boolean) => {
        if (selectedIds.length === 0) return
        setIsBulkLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            await Promise.all(selectedIds.map(id => toggleServerVisibility(id, token, hide)))
            if (triggerToast) triggerToast("success", `${selectedIds.length} serveur(s) ont été ${hide ? "caché(s)" : "affiché(s)"}.`)
            onRefresh()
            setSelectedIds([])
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("common.error") || "Erreur lors de l'opération en masse.")
        } finally {
            setIsBulkLoading(false)
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === sortedServers.length && sortedServers.length > 0) {
            setSelectedIds([])
        } else {
            setSelectedIds(sortedServers.map(s => s.id))
        }
    }

    const toggleSelectOne = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const filteredServers = useMemo(() => {
        let list = servers
        const query = serverSearchQuery.trim().toLowerCase()

        if (query) {
            list = list.filter(s => 
                s.name.toLowerCase().includes(query) ||
                s.ip.toLowerCase().includes(query)
            )
        }

        if (serverStatusFilter === "online") {
            list = list.filter(s => s.last_status === "online")
        } else if (serverStatusFilter === "offline") {
            list = list.filter(s => s.last_status === "offline")
        } else if (serverStatusFilter === "hidden") {
            list = list.filter(s => s.hidden === true)
        }

        return list
    }, [servers, serverSearchQuery, serverStatusFilter])

    const sortedServers = useMemo(() => {
        const list = [...filteredServers]
        return list.sort((a, b) => {
            let valA: any = ""
            let valB: any = ""

            if (sortField === "name") {
                valA = a.name.toLowerCase()
                valB = b.name.toLowerCase()
            } else if (sortField === "creator") {
                const creatorA = users.find(u => u.id === a.user_id)
                const creatorB = users.find(u => u.id === b.user_id)
                valA = getUserDisplayName(creatorA).toLowerCase()
                valB = getUserDisplayName(creatorB).toLowerCase()
            } else if (sortField === "ip") {
                valA = `${a.ip}:${a.port}`.toLowerCase()
                valB = `${b.ip}:${b.port}`.toLowerCase()
            } else if (sortField === "status") {
                valA = a.last_status || ""
                valB = b.last_status || ""
            } else if (sortField === "players") {
                valA = a.last_status === "online" ? (a.last_connected ?? 0) : -1
                valB = b.last_status === "online" ? (b.last_connected ?? 0) : -1
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1
            if (valA > valB) return sortDirection === "asc" ? 1 : -1
            return 0
        })
    }, [filteredServers, sortField, sortDirection, users, getUserDisplayName])

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortDirection("asc")
        }
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Search Filters panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="servers-search"
                        type="text"
                        placeholder={t("admin.servers.searchPlaceholder")}
                        value={serverSearchQuery}
                        onChange={(e) => setServerSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-background border-slate-200/85 dark:border-zinc-855"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setServerStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            serverStatusFilter === "all" 
                                ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-900" 
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {t("admin.servers.statusAll")}
                    </button>
                    <button
                        onClick={() => setServerStatusFilter("online")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "online" 
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20" 
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {t("admin.servers.statusOnline")}
                    </button>
                    <button
                        onClick={() => setServerStatusFilter("offline")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "offline" 
                                ? "bg-rose-500/10 text-rose-650 dark:text-rose-450 border border-rose-500/20" 
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        {t("admin.servers.statusOffline")}
                    </button>
                    <button
                        onClick={() => setServerStatusFilter("hidden")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "hidden" 
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-450 border border-amber-500/20" 
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-zinc-800"
                        }`}
                    >
                        {t("admin.servers.statusHidden")}
                    </button>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 bg-muted/30 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 shadow-xs">
                    <span className="text-sm font-semibold text-foreground">
                        {selectedIds.length} serveur(s) sélectionné(s)
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            disabled={isBulkLoading}
                            onClick={() => handleBulkVisibility(false)}
                        >
                            <Eye className="h-3 w-3" /> Montrer
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            disabled={isBulkLoading}
                            onClick={() => handleBulkVisibility(true)}
                        >
                            <EyeOff className="h-3 w-3" /> Cacher
                        </Button>
                        <BulkDeleteModal selectedIds={selectedIds} onClear={() => setSelectedIds([])} onSuccess={onRefresh} triggerToast={triggerToast} />
                    </div>
                </div>
            )}

            {/* Servers Data Table */}
            <div className="border rounded-xl bg-card overflow-x-auto shadow-xs border-slate-200/60 dark:border-zinc-800">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-slate-50/70 dark:bg-zinc-950/50 text-muted-foreground font-semibold">
                            <th className="p-4 w-10 text-center rounded-tl-xl">
                                <Checkbox 
                                    checked={sortedServers.length > 0 && selectedIds.length === sortedServers.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label="Select all"
                                />
                            </th>
                            <th 
                                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none"
                                onClick={() => handleSort("name")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("admin.servers.tableServer")}
                                    {sortField === "name" && (
                                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none"
                                onClick={() => handleSort("creator")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("admin.servers.creator")}
                                    {sortField === "creator" && (
                                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none"
                                onClick={() => handleSort("ip")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("admin.serverIp")}
                                    {sortField === "ip" && (
                                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none"
                                onClick={() => handleSort("status")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("admin.serverStatus")}
                                    {sortField === "status" && (
                                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th 
                                className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors select-none"
                                onClick={() => handleSort("players")}
                            >
                                <div className="flex items-center gap-1">
                                    {t("admin.servers.tablePlayers")}
                                    {sortField === "players" && (
                                        sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                                    )}
                                </div>
                            </th>
                            <th className="p-4 text-right rounded-tr-xl">{t("admin.servers.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedServers.length > 0 ? (
                            sortedServers.map((server) => {
                                const creator = users.find(u => u.id === server.user_id)
                                const isOnline = server.last_status === "online"
                                const isHidden = server.hidden === true

                                return (
                                    <tr 
                                        key={server.id} 
                                        className={`hover:bg-slate-50/30 dark:hover:bg-zinc-850/20 transition-all ${
                                            isHidden ? "opacity-60 bg-slate-50/10 dark:bg-zinc-900/10" : ""
                                        }`}
                                    >
                                        <td className="p-4 text-center">
                                            <Checkbox 
                                                checked={selectedIds.includes(server.id)}
                                                onCheckedChange={() => toggleSelectOne(server.id)}
                                                aria-label="Select server"
                                            />
                                        </td>
                                        <td className="p-4 font-bold flex items-center gap-3">
                                            {server.last_favicon ? (
                                                <img
                                                    src={server.last_favicon}
                                                    alt=""
                                                    className="h-7 w-7 rounded shadow-xs flex-shrink-0 border"
                                                />
                                            ) : (
                                                <div className="h-7 w-7 rounded bg-muted flex items-center justify-center text-muted-foreground border flex-shrink-0">
                                                    <ServerIcon className="h-3.5 w-3.5" />
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                    {server.name}
                                                    {isHidden && (
                                                        <Badge variant="destructive" className="h-3 text-[8px] px-1 py-0 uppercase">
                                                            {t("admin.hiddenBadge")}
                                                        </Badge>
                                                    )}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">v{server.last_version || "unknown"}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {creator?.image_url ? (
                                                    <img
                                                        src={creator.image_url}
                                                        alt=""
                                                        className="h-5 w-5 rounded-full object-cover border"
                                                    />
                                                ) : (
                                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                                )}
                                                <span className="font-medium">{getUserDisplayName(creator)}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-medium text-muted-foreground">
                                            {server.ip}:{server.port}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                                isOnline 
                                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            }`}>
                                                {isOnline ? t("common.online") : t("common.offline")}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-semibold">
                                            {isOnline ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">
                                                    {server.last_connected ?? 0}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Link to={`/server/${server.id}`} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="outline" size="sm">
                                                        {t("admin.servers.inspect")}
                                                    </Button>
                                                </Link>
                                                
                                                <Button 
                                                    variant={isHidden ? "default" : "destructive"} 
                                                    size="sm" 
                                                    className="gap-1"
                                                    disabled={togglingServerId === server.id}
                                                    onClick={() => handleToggleServer(server.id, isHidden)}
                                                >
                                                    {isHidden ? (
                                                        <>
                                                            <Eye className="h-3 w-3" />
                                                            {t("admin.showServer")}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <EyeOff className="h-3 w-3" />
                                                            {t("admin.hideServer")}
                                                        </>
                                                    )}
                                                </Button>
                                                
                                                <RenameServerModal server={server} onSuccess={onRefresh} t={t} />
                                                <DeleteServerModal server={server} onSuccess={onRefresh} triggerToast={triggerToast} />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground italic">
                                    {t("admin.servers.noServers")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function BulkDeleteModal({ selectedIds, onSuccess, triggerToast, onClear }: { selectedIds: number[], onSuccess: () => void, triggerToast?: (type: "success" | "warning" | "error", text: string) => void, onClear: () => void }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText !== "CONFIRMER") return

        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                await Promise.all(selectedIds.map(id => deleteServer(id, token)))
                setOpen(false)
                onSuccess()
                if (triggerToast) {
                    triggerToast("success", `${selectedIds.length} serveur(s) ont été supprimés.`)
                }
                onClear()
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", "Erreur lors de la suppression.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) setConfirmText("")
            setOpen(v)
        }}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
                    <Trash2 className="h-3 w-3" />
                    Supprimer {selectedIds.length}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Supprimer {selectedIds.length} serveurs</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer <strong>{selectedIds.length}</strong> serveurs ? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="bulk-confirm">Veuillez taper <strong>CONFIRMER</strong> pour valider</Label>
                        <Input
                            id="bulk-confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="CONFIRMER"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button type="submit" variant="destructive" disabled={loading || confirmText !== "CONFIRMER"}>
                            {loading ? "Suppression..." : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function RenameServerModal({ server, onSuccess, t }: { server: Server, onSuccess: () => void, t: any }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || name.trim() === server.name) return

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await renameServer(server.id, name.trim(), token)
            if (res.success) {
                setOpen(false)
                onSuccess()
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
                <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-3 w-3" />
                    {t("admin.servers.rename")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("admin.servers.renameTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("admin.servers.renameDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t("admin.servers.renameLabel")}</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("admin.servers.renamePlaceholder")}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim() || name.trim() === server.name}>
                            {loading ? t("admin.servers.renameSaving") : t("admin.servers.renameSave")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

function DeleteServerModal({ server, onSuccess, triggerToast }: { server: Server, onSuccess: () => void, triggerToast?: (type: "success" | "warning" | "error", text: string) => void }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText !== "CONFIRMER") return

        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const res = await deleteServer(server.id, token)
                if (res.success) {
                    setOpen(false)
                    onSuccess()
                    if (triggerToast) {
                        triggerToast("success", `Le serveur ${server.name} a été supprimé.`)
                    }
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) setConfirmText("")
            setOpen(v)
        }}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                    <Trash2 className="h-3 w-3" />
                    Supprimer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Supprimer le serveur</DialogTitle>
                    <DialogDescription>
                        Êtes-vous sûr de vouloir supprimer le serveur <strong>{server.name}</strong> ? Cette action est irréversible.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`confirm-${server.id}`}>Veuillez taper <strong>CONFIRMER</strong> pour valider</Label>
                        <Input
                            id={`confirm-${server.id}`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder="CONFIRMER"
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                        <Button type="submit" variant="destructive" disabled={loading || confirmText !== "CONFIRMER"}>
                            {loading ? "Suppression..." : "Supprimer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
