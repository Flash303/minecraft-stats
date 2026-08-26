import { useState } from 'react';
import {
    Search,
    ArrowUp,
    ArrowDown,
    User as UserIcon,
    Eye,
    EyeOff
} from "lucide-react"
import { useAuth } from "@clerk/react"
import { toggleServerVisibility } from "@/core/lib/api"
import { ServerIcon as CustomServerIcon } from "@/ui/components/ServerIcon"


import { Checkbox } from "@/ui/components/checkbox"
import { Input } from "@/ui/components/input"
import { Button } from "@/ui/components/button"
import { Badge } from "@/ui/components/badge"
import { Link } from "react-router"
import { formatMinecraftVersion } from "@/core/lib/utils"
import type { Server, User } from "@/core/lib/api"

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

import { BulkDeleteModal } from "./BulkDeleteModal"
import { RowActionsMenu } from "./RowActionsMenu"
import { useServersFilterSort } from "@/core/hooks/useServersFilterSort"

type SortableField = "name" | "creator" | "ip" | "status" | "players"

/** En-tête de colonne triable, accessible au clavier (bouton + aria-sort). */
function SortableTh({ field, label, sortField, sortDirection, onSort }: {
    field: SortableField
    label: string
    sortField: string
    sortDirection: "asc" | "desc"
    onSort: (field: SortableField) => void
}) {
    const isSorted = sortField === field
    return (
        <th
            className="p-4 select-none"
            aria-sort={isSorted ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
        >
            <button
                type="button"
                onClick={() => onSort(field)}
                className="flex items-center gap-1 cursor-pointer hover:bg-accent transition-colors rounded p-1 -m-1 text-left w-full"
            >
                {label}
                {isSorted && (
                    sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
            </button>
        </th>
    )
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
        const {
        serverSearchQuery,
        setServerSearchQuery,
        serverStatusFilter,
        setServerStatusFilter,
        sortField,
        sortDirection,
        handleSort,
        sortedServers
    } = useServersFilterSort({ servers, users, getUserDisplayName })

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
            if (triggerToast) triggerToast("success", t("admin.servers.bulkVisibilitySuccess", { count: selectedIds.length.toString(), action: hide ? t("admin.servers.bulkVisibilityHidden") : t("admin.servers.bulkVisibilityShown") }))
            onRefresh()
            setSelectedIds([])
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.bulkError"))
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
                        className="pl-9 h-10 rounded-xl bg-background border-border"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        aria-pressed={serverStatusFilter === "all"}
                        onClick={() => setServerStatusFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            serverStatusFilter === "all"
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                        {t("admin.servers.statusAll")}
                    </button>
                    <button
                        type="button"
                        aria-pressed={serverStatusFilter === "online"}
                        onClick={() => setServerStatusFilter("online")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "online"
                                ? "bg-success/10 text-success border border-success/20"
                                : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                        {t("admin.servers.statusOnline")}
                    </button>
                    <button
                        type="button"
                        aria-pressed={serverStatusFilter === "offline"}
                        onClick={() => setServerStatusFilter("offline")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "offline"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                        {t("admin.servers.statusOffline")}
                    </button>
                    <button
                        type="button"
                        aria-pressed={serverStatusFilter === "hidden"}
                        onClick={() => setServerStatusFilter("hidden")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                            serverStatusFilter === "hidden"
                                ? "bg-warning/10 text-warning border border-warning/20"
                                : "text-muted-foreground hover:bg-accent"
                        }`}
                    >
                        {t("admin.servers.statusHidden")}
                    </button>
                </div>
            </div>

            {selectedIds.length > 0 && (
                <div className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl p-3 shadow-xs">
                    <span className="text-sm font-semibold text-foreground">
                        {t("admin.servers.selectedCount", { count: selectedIds.length.toString() })}
                    </span>
                    <div className="flex items-center gap-2 ml-auto">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            disabled={isBulkLoading}
                            onClick={() => handleBulkVisibility(false)}
                        >
                            <Eye className="h-3 w-3" /> {t("admin.servers.showBulk")}
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs gap-1"
                            disabled={isBulkLoading}
                            onClick={() => handleBulkVisibility(true)}
                        >
                            <EyeOff className="h-3 w-3" /> {t("admin.servers.hideBulk")}
                        </Button>
                        <BulkDeleteModal selectedIds={selectedIds} onClear={() => setSelectedIds([])} onSuccess={onRefresh} triggerToast={triggerToast} t={t} />
                    </div>
                </div>
            )}

            {/* Servers Data Table */}
            <div className="border rounded-xl bg-card overflow-x-auto shadow-xs border-border/60">
                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b bg-muted/40 text-muted-foreground font-semibold">
                            <th className="p-4 w-10 text-center rounded-tl-xl">
                                <Checkbox
                                    checked={sortedServers.length > 0 && selectedIds.length === sortedServers.length}
                                    onCheckedChange={toggleSelectAll}
                                    aria-label={t("admin.servers.selectAll")}
                                />
                            </th>
                            <SortableTh field="name" label={t("admin.servers.tableServer")} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableTh field="creator" label={t("admin.servers.creator")} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableTh field="ip" label={t("admin.serverIp")} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableTh field="status" label={t("admin.serverStatus")} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                            <SortableTh field="players" label={t("admin.servers.tablePlayers")} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
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
                                        className={`hover:bg-muted/30 transition-all ${
                                            isHidden ? "opacity-60 bg-muted/20" : ""
                                        }`}
                                    >
                                        <td className="p-4 text-center">
                                            <Checkbox
                                                checked={selectedIds.includes(server.id)}
                                                onCheckedChange={() => toggleSelectOne(server.id)}
                                                aria-label={t("admin.servers.selectServer", { name: server.name })}
                                            />
                                        </td>
                                        <td className="p-4 font-bold">
                                            <div className="flex items-center gap-3">
                                                <CustomServerIcon
                                                    serverId={server.id}
                                                    alt={t("alt.serverLogo", { name: server.name })}
                                                    className="h-7 w-7 rounded shadow-xs flex-shrink-0 border"
                                                />
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                        {server.name}
                                                        {isHidden && (
                                                            <Badge variant="destructive" className="h-3 text-[8px] px-1 py-0 uppercase">
                                                                {t("admin.hiddenBadge")}
                                                            </Badge>
                                                        )}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground mt-0.5 font-normal">v{formatMinecraftVersion(server.last_version) || "unknown"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {creator?.image_url ? (
                                                    <img
                                                        src={creator.image_url}
                                                        alt={t("alt.userAvatar", { name: creator.username || t("profile.defaultUser") })}
                                                        className="h-5 w-5 rounded-full object-cover border"
                                                        loading="lazy"
                                                        decoding="async"
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
? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive"
                                            }`}>
                                                {isOnline ? t("common.online") : t("common.offline")}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-semibold">
                                            {isOnline ? (
                                                <span className="text-success">
                                                    {server.last_connected ?? 0}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-0.5">
                                                <Link to={`/server/${server.id}`} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="ghost" size="sm" className="h-8 px-2.5 text-xs cursor-pointer">
                                                        {t("admin.servers.inspect")}
                                                    </Button>
                                                </Link>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                                    disabled={togglingServerId === server.id}
                                                    onClick={() => handleToggleServer(server.id, isHidden)}
                                                    aria-label={isHidden ? t("admin.showServer") : t("admin.hideServer")}
                                                    title={isHidden ? t("admin.showServer") : t("admin.hideServer")}
                                                >
                                                    {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                </Button>

                                                <RowActionsMenu server={server} onSuccess={onRefresh} triggerToast={triggerToast} t={t} />
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
