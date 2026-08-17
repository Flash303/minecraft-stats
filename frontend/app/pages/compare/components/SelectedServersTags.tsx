import { X } from "lucide-react"
import { Link } from "react-router"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { useClientInfo } from "@/core/contexts/ClientInfoContext"
import type { Server } from "@/core/lib/api"

interface SelectedServersTagsProps {
    selectedServers: Server[]
    removeServer: (id: number) => void
}

export function SelectedServersTags({ selectedServers, removeServer }: SelectedServersTagsProps) {
    const { getLunarInfo, getLabyInfo } = useClientInfo()

    if (selectedServers.length === 0) return null

    return (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {selectedServers.map((s) => (
                <div
                    key={s.id}
                    className="flex items-center rounded-xl border border-indigo-500/10 dark:border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-500/10 shadow-xs hover:border-indigo-500/35 transition-colors overflow-hidden"
                >
                    {/* Zone cliquable → page de détails */}
                    <Link
                        to={`/server/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
                        title={`Voir ${s.name}`}
                    >
                        <ServerIcon
                            serverId={s.id}
                            className="h-5 w-5 rounded-md object-cover shadow-xs flex-shrink-0"
                            alt=""
                        />
                        <span className="font-bold">{s.name}</span>
                        {getLunarInfo(s.ip) && (
                            <LunarLogo className="w-3.5 h-3.5 text-sky-500 shrink-0" title="Lunar Client" />
                        )}
                        {getLabyInfo(s.ip) && (
                            <img
                                src="https://laby.net/logo.svg"
                                className="w-3.5 h-3.5 object-contain dark:brightness-100 brightness-0 shrink-0"
                                alt="LabyMod"
                                title="LabyMod"
                            />
                        )}
                    </Link>

                    {/* Séparateur */}
                    <div className="w-px h-4 bg-indigo-500/20 flex-shrink-0" />

                    {/* Bouton retirer */}
                    <button
                        onClick={() => removeServer(s.id)}
                        className="flex items-center justify-center px-2.5 py-2 text-indigo-400 hover:text-rose-500 transition-colors cursor-pointer focus:outline-none"
                        title="Retirer"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}
