import { Edit2 } from "lucide-react"
import { Button } from "@/ui/components/button"
import { RenameServerModal } from "@/ui/components/RenameServerModal"
import type { Server } from "@/core/lib/api"

interface RenameServerModalButtonProps {
    server: Server
    onSuccess: () => void
    t: (key: string, options?: Record<string, string>) => string
}

export function RenameServerModalButton({ server, onSuccess, t }: RenameServerModalButtonProps) {
    return (
        <RenameServerModal
            server={server}
            onSuccess={onSuccess}
            texts={{
                title: t("admin.servers.renameTitle"),
                description: t("admin.servers.renameDesc"),
                label: t("admin.servers.renameLabel"),
                save: t("admin.servers.renameSave"),
                saving: t("admin.servers.renameSaving"),
                placeholder: t("admin.servers.renamePlaceholder"),
                error: t("admin.servers.renameError"),
            }}
            trigger={
                <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-3 w-3" />
                    {t("admin.servers.rename")}
                </Button>
            }
        />
    )
}
