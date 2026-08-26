import { Edit2 } from "lucide-react"
import { Button } from "@/ui/components/button"
import { RenameServerModal } from "@/ui/components/RenameServerModal"
import { useLanguage } from "@/core/contexts/LanguageContext"
import type { Server } from "@/core/lib/api"

export function RenameServerModalButton({ server, onSuccess }: { server: Server, onSuccess: () => void }) {
    const { t } = useLanguage()

    return (
        <RenameServerModal
            server={server}
            onSuccess={onSuccess}
            texts={{
                title: t("profile.servers.renameTitle"),
                description: t("profile.servers.renameDesc"),
                label: t("profile.servers.renameLabel"),
                save: t("profile.servers.renameSave"),
                saving: t("profile.servers.renameSaving"),
            }}
            trigger={
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-muted cursor-pointer text-muted-foreground">
                    <Edit2 className="h-4 w-4" />
                </Button>
            }
        />
    )
}
