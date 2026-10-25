import { useMemo, useState } from "react"
import type { Server, User } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { Input } from "@/ui/components/input"
import { Label } from "@/ui/components/label"
import { useAuth } from "@clerk/react"
import { Search, User as UserIcon, Check } from "lucide-react"
import { updateServerOwner } from "@/core/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/components/dialog"

interface TransferOwnerModalProps {
    server: Server
    users: User[]
    getUserDisplayName: (user?: User | null) => string
    onSuccess: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
    t: (key: string, options?: Record<string, string>) => string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function TransferOwnerModal({ server, users, getUserDisplayName, onSuccess, triggerToast, t, open, onOpenChange }: TransferOwnerModalProps) {
    const { getToken } = useAuth()
    const [search, setSearch] = useState("")
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setSearch("")
            setSelectedUserId(null)
            setConfirmText("")
        }
        onOpenChange(v)
    }

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return users
        return users.filter((u) => {
            const haystack = [u.username, u.first_name, u.last_name, u.id]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
            return haystack.includes(q)
        })
    }, [users, search])

    const selectedUser = selectedUserId ? users.find((u) => u.id === selectedUserId) ?? null : null
    const isSameOwner = selectedUserId !== null && selectedUserId === server.user_id
    const canSubmit = selectedUserId !== null && !isSameOwner && confirmText === t("admin.servers.confirmText") && !loading

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!canSubmit || !selectedUserId) return

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await updateServerOwner(server.id, selectedUserId, token)
            if (res.success) {
                handleOpenChange(false)
                onSuccess()
                if (triggerToast) {
                    triggerToast("success", t("admin.servers.changeOwnerSuccess", { name: server.name }))
                }
            } else {
                if (triggerToast) {
                    triggerToast("error", res.message_key ? t(res.message_key) : (res.message || t("admin.servers.changeOwnerError")))
                }
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.changeOwnerError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.servers.changeOwnerTitle")}</DialogTitle>
                    <DialogDescription>{t("admin.servers.changeOwnerDesc", { name: server.name })}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder={t("admin.servers.changeOwnerSearch")}
                            className="pl-9"
                            aria-label={t("admin.servers.changeOwnerSearch")}
                        />
                    </div>

                    <div
                        role="listbox"
                        aria-label={t("admin.servers.changeOwnerTitle")}
                        className="max-h-56 overflow-y-auto rounded-md border divide-y"
                    >
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => {
                                const isSelected = user.id === selectedUserId
                                const isCurrent = user.id === server.user_id
                                return (
                                    <button
                                        key={user.id}
                                        type="button"
                                        role="option"
                                        aria-selected={isSelected}
                                        disabled={isCurrent}
                                        onClick={() => setSelectedUserId(user.id)}
                                        className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${isCurrent ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/60"} ${isSelected ? "bg-primary/10" : ""}`}
                                    >
                                        {user.image_url ? (
                                            <img
                                                src={user.image_url}
                                                alt=""
                                                loading="lazy"
                                                decoding="async"
                                                className="h-7 w-7 rounded-full object-cover border flex-shrink-0"
                                            />
                                        ) : (
                                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border bg-muted">
                                                <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                            </span>
                                        )}
                                        <span className="flex min-w-0 flex-1 flex-col">
                                            <span className="truncate font-medium">
                                                {getUserDisplayName(user)}
                                                {isCurrent && (
                                                    <span className="ml-2 text-2xs font-medium text-muted-foreground">
                                                        {t("admin.servers.changeOwnerCurrent")}
                                                    </span>
                                                )}
                                            </span>
                                            {user.username && (
                                                <span className="truncate text-xs text-muted-foreground">@{user.username}</span>
                                            )}
                                        </span>
                                        {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-primary" />}
                                    </button>
                                )
                            })
                        ) : (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground italic">
                                {t("admin.servers.changeOwnerNoResults")}
                            </p>
                        )}
                    </div>

                    {selectedUser && !isSameOwner && (
                        <p className="text-sm text-muted-foreground">
                            {t("admin.servers.changeOwnerConfirm", { name: getUserDisplayName(selectedUser) })}
                        </p>
                    )}

                    <div className="grid gap-2">
                        <Label htmlFor={`confirm-owner-${server.id}`}>{t("admin.servers.typeConfirm")}</Label>
                        <Input
                            id={`confirm-owner-${server.id}`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={t("admin.servers.confirmText")}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={!canSubmit}>
                            {loading ? t("admin.servers.saving") : t("admin.servers.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
