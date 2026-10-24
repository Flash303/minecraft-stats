import type { Server } from "@/core/lib/api"
import { ServerCard } from "@/pages/home/components/ServerCard"
import { RenameServerModalButton } from "./RenameServerModal"

interface AccountServerCardProps {
    server: Server
    onSuccess: () => void
}

export function AccountServerCard({ server, onSuccess }: AccountServerCardProps) {
    return (
        <div className="relative group">
            <ServerCard server={server} to={`/server/${server.id}`} />
            <div className="absolute top-3 right-3 z-10 rounded-lg border border-border bg-background/95 p-0.5 opacity-100 shadow-sm backdrop-blur-md transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                <RenameServerModalButton server={server} onSuccess={onSuccess} />
            </div>
        </div>
    )
}
