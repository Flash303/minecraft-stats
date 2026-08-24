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
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/95 backdrop-blur-md rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-700 p-0.5">
                <RenameServerModalButton server={server} onSuccess={onSuccess} />
            </div>
        </div>
    )
}
