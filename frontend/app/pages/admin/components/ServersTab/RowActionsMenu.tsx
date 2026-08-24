import { useState, Fragment } from "react"
import type { Server } from "@/core/lib/api"
import type { LucideIcon } from "lucide-react"
import { Pencil, Globe, ImageIcon, Trash2, EllipsisVertical } from "lucide-react"
import { Button } from "@/ui/components/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/ui/components/dropdown-menu"
import { RenameServerModal } from "@/ui/components/RenameServerModal"
import { ChangeIpModal } from "./ChangeIpModal"
import { UpdateFaviconModal } from "./UpdateFaviconModal"
import { DeleteServerModal } from "./DeleteServerModal"

type RowAction = "rename" | "ip" | "favicon" | "delete"

interface MenuEntry {
    key: RowAction
    icon: LucideIcon
    labelKey: string
    destructive?: boolean
}

const MENU_ENTRIES: MenuEntry[] = [
    { key: "rename", icon: Pencil, labelKey: "admin.servers.rename" },
    { key: "ip", icon: Globe, labelKey: "admin.servers.changeIp" },
    { key: "favicon", icon: ImageIcon, labelKey: "admin.servers.updateFavicon" },
    { key: "delete", icon: Trash2, labelKey: "admin.servers.delete", destructive: true },
]

interface RowActionsMenuProps {
    server: Server
    onSuccess: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
    t: (key: string, options?: Record<string, string>) => string
}

export function RowActionsMenu({ server, onSuccess, triggerToast, t }: RowActionsMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false)
    const [activeAction, setActiveAction] = useState<RowAction | null>(null)

    const openAction = (action: RowAction) => {
        setMenuOpen(false)
        setActiveAction(action)
    }

    const closeAction = (open: boolean) => {
        if (!open) setActiveAction(null)
    }

    const handleSuccess = () => {
        setActiveAction(null)
        onSuccess()
    }

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label={t("admin.servers.moreActions")}
                        title={t("admin.servers.moreActions")}
                    >
                        <EllipsisVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    {MENU_ENTRIES.map((entry) => (
                        <Fragment key={entry.key}>
                            {entry.destructive && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                variant={entry.destructive ? "destructive" : "default"}
                                onClick={() => openAction(entry.key)}
                            >
                                <entry.icon />
                                {t(entry.labelKey)}
                            </DropdownMenuItem>
                        </Fragment>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <RenameServerModal
                server={server}
                onSuccess={handleSuccess}
                open={activeAction === "rename"}
                onOpenChange={closeAction}
                texts={{
                    title: t("admin.servers.renameTitle"),
                    description: t("admin.servers.renameDesc"),
                    label: t("admin.servers.renameLabel"),
                    save: t("admin.servers.renameSave"),
                    saving: t("admin.servers.renameSaving"),
                    placeholder: t("admin.servers.renamePlaceholder"),
                    error: t("admin.servers.renameError"),
                }}
            />

            {activeAction === "ip" && (
                <ChangeIpModal
                    server={server}
                    onSuccess={handleSuccess}
                    triggerToast={triggerToast}
                    t={t}
                    open
                    onOpenChange={closeAction}
                />
            )}

            {activeAction === "favicon" && (
                <UpdateFaviconModal
                    server={server}
                    onSuccess={handleSuccess}
                    triggerToast={triggerToast}
                    t={t}
                    open
                    onOpenChange={closeAction}
                />
            )}

            {activeAction === "delete" && (
                <DeleteServerModal
                    server={server}
                    onSuccess={handleSuccess}
                    triggerToast={triggerToast}
                    t={t}
                    open
                    onOpenChange={closeAction}
                />
            )}
        </>
    )
}
