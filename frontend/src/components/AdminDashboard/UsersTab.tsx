import { useState, useMemo } from "react"
import { Link } from "react-router-dom"
import type { User, Server } from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog"
import {
    Users,
    Server as ServerIcon,
    Search,
    User as UserIcon,
    Eye,
    EyeOff,
    ExternalLink
} from "lucide-react"

interface UsersTabProps {
    users: User[]
    servers: Server[]
    togglingServerId: number | null
    handleToggleServer: (serverId: number, currentHidden: boolean) => Promise<void>
    getUserDisplayName: (user?: User | null) => string
    t: (key: string, replacements?: Record<string, string>) => string
}

export function UsersTab({
    users,
    servers,
    togglingServerId,
    handleToggleServer,
    getUserDisplayName,
    t
}: UsersTabProps) {
    const [userSearchQuery, setUserSearchQuery] = useState("")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [isInspectOpen, setIsInspectOpen] = useState(false)

    // Filtered users list
    const filteredUsers = useMemo(() => {
        const query = userSearchQuery.trim().toLowerCase()
        if (!query) return users
        return users.filter(user => {
            const fullName = `${user.first_name || ""} ${user.last_name || ""}`.toLowerCase()
            return (
                fullName.includes(query) ||
                (user.username || "").toLowerCase().includes(query) ||
                user.id.toLowerCase().includes(query)
            )
        })
    }, [users, userSearchQuery])

    const selectedUser = useMemo(() => {
        return users.find(u => u.id === selectedUserId) || null
    }, [users, selectedUserId])

    const selectedUserServers = useMemo(() => {
        return selectedUserId ? servers.filter(s => s.user_id === selectedUserId) : []
    }, [selectedUserId, servers])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
                <h2 className="text-md font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    {t("admin.usersList")} ({filteredUsers.length})
                </h2>
                <div className="relative max-w-sm">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="users-search-grid"
                        type="text"
                        placeholder={t("admin.searchUser")}
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl bg-white dark:bg-zinc-900 border-slate-200/85 dark:border-zinc-850"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-2">
                {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                        const userServers = servers.filter(s => s.user_id === user.id)
                        return (
                            <Card key={user.id} className="hover:shadow-md transition-all duration-300 bg-white dark:bg-zinc-900 border-slate-200/60 dark:border-zinc-800 rounded-2xl flex flex-col text-center p-6 gap-0">
                                {/* Avatar */}
                                {user.image_url ? (
                                    <img
                                        src={user.image_url}
                                        alt={user.username || "User avatar"}
                                        className="h-16 w-16 mx-auto rounded-full object-cover border-2 border-primary/10 shadow-sm"
                                    />
                                ) : (
                                    <div className="h-16 w-16 mx-auto rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-muted-foreground border-2 border-primary/10">
                                        <UserIcon className="h-8 w-8" />
                                    </div>
                                )}

                                {/* Details */}
                                <span className="text-sm font-bold text-foreground mt-4 truncate">
                                    {getUserDisplayName(user)}
                                </span>

                                <span className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                                    {user.username ? `@${user.username}` : user.id}
                                </span>

                                <div className="text-[10px] text-muted-foreground/60 font-mono select-all bg-slate-50 dark:bg-zinc-950/40 py-1 px-2.5 rounded-lg w-fit mx-auto mt-3 truncate max-w-full border dark:border-zinc-800">
                                    {user.id}
                                </div>

                                 <div className="flex justify-center items-center gap-1.5 mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/80 text-xs font-semibold text-muted-foreground">
                                    <ServerIcon className="h-3.5 w-3.5 text-primary/70" />
                                    <span>
                                        {t(
                                            userServers.length > 1
                                                ? "admin.users.serversCreatedCount_other"
                                                : "admin.users.serversCreatedCount_one",
                                            { count: String(userServers.length) }
                                        )}
                                    </span>
                                </div>

                                {/* Action CTA */}
                                <Button 
                                    id={`btn-inspect-user-${user.id}`}
                                    onClick={() => { setSelectedUserId(user.id); setIsInspectOpen(true); }}
                                    className="w-full mt-4 h-9 text-xs rounded-xl cursor-pointer" 
                                    variant="outline"
                                >
                                    {t("admin.users.manageServers")}
                                </Button>
                            </Card>
                        )
                    })
                ) : (
                    <div className="col-span-full py-16 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-card border-slate-200 dark:border-zinc-800">
                        {t("admin.users.noUsers")}
                    </div>
                )}
            </div>

            {/* User details inspector Dialog modal */}
            <Dialog open={isInspectOpen} onOpenChange={setIsInspectOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            {selectedUser?.image_url ? (
                                <img 
                                    src={selectedUser.image_url} 
                                    className="h-10 w-10 rounded-full object-cover border" 
                                    alt="" 
                                />
                            ) : (
                                <UserIcon className="h-10 w-10 text-muted-foreground bg-muted p-2 rounded-full border" />
                            )}
                            <div className="flex flex-col text-left">
                                <span className="text-base font-bold text-foreground">{getUserDisplayName(selectedUser)}</span>
                                <span className="text-xs text-muted-foreground font-normal">@{selectedUser?.username || selectedUser?.id}</span>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="font-mono text-[10px] mt-1 truncate text-left">
                            ID: {selectedUser?.id}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <ServerIcon className="h-4 w-4 text-primary" />
                            {t("admin.createdServers")} ({selectedUserServers.length})
                        </h3>

                        {selectedUserServers.length > 0 ? (
                            <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                                {selectedUserServers.map((server) => {
                                    const isHidden = server.hidden === true
                                    return (
                                        <div 
                                            key={server.id} 
                                            className={`flex items-center justify-between gap-4 p-3 rounded-xl border transition-all duration-300 ${
                                                isHidden 
                                                    ? "bg-slate-100/40 dark:bg-slate-900/10 border-dashed border-slate-300 dark:border-zinc-800 opacity-70" 
                                                    : "bg-white dark:bg-zinc-900/20 border-slate-200 dark:border-zinc-850 hover:shadow-xs"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                {server.last_favicon ? (
                                                    <img 
                                                        src={server.last_favicon} 
                                                        className="h-8 w-8 rounded shadow-xs flex-shrink-0 border" 
                                                        alt="" 
                                                    />
                                                ) : (
                                                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-muted-foreground border flex-shrink-0">
                                                        <ServerIcon className="h-4 w-4" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-foreground leading-none">{server.name}</span>
                                                        {isHidden && (
                                                            <Badge variant="destructive" className="h-3.5 text-[8px] px-1 py-0 uppercase">{t("admin.hiddenBadge")}</Badge>
                                                        )}
                                                    </div>
                                                    <span className="font-mono text-[10px] text-muted-foreground mt-0.5 truncate">{server.ip}:{server.port}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Link to={`/server/${server.id}`} target="_blank" rel="noopener noreferrer">
                                                    <Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer">
                                                        <ExternalLink className="h-3.5 w-3.5" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant={isHidden ? "default" : "destructive"}
                                                    size="icon"
                                                    className="h-7 w-7 cursor-pointer"
                                                    disabled={togglingServerId === server.id}
                                                    onClick={() => handleToggleServer(server.id, isHidden)}
                                                >
                                                    {isHidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center text-muted-foreground border-2 border-dashed rounded-xl bg-muted/20 text-xs italic">
                                {t("admin.noServers")}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
