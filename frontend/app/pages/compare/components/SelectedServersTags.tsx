import { X } from "lucide-react"
import { Link } from "react-router"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { lunarLogoClass, labyLogoClass } from "@/core/lib/theme-colors"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"

import { useLanguage } from "@/core/contexts/LanguageContext"
import type { Server } from "@/core/lib/api"
import { cn } from "@/core/lib/utils"

interface SelectedServersTagsProps {
    selectedServers: Server[]
    removeServer: (id: number) => void
}

export function SelectedServersTags({ selectedServers, removeServer }: SelectedServersTagsProps) {

    const { t } = useLanguage()

    if (selectedServers.length === 0) return null

    return (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {selectedServers.map((s) => (
                <div
                    key={s.id}
                    className="flex items-center rounded-xl border border-primary/20 bg-primary/10 shadow-xs hover:border-primary/30 transition-colors overflow-hidden"
                >
                    {/* Zone cliquable → page de détails */}
                    <Link
                        to={`/server/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-primary hover:text-primary/80 transition-colors"
                        title={t("common.viewServer", { name: s.name })}
                    >
                        <ServerIcon
                            serverId={s.id}
                            className="h-5 w-5 rounded-md object-cover shadow-xs flex-shrink-0"
                            alt=""
                        />
                        <span className="font-bold">{s.name}</span>
                        {s.client_infos?.lunar && (
                            <LunarLogo className={cn("w-3.5 h-3.5 shrink-0", lunarLogoClass(s.client_infos.lunar.partner))} />
                        )}
                        {s.client_infos?.laby && (
                            <LabyLogo
                                className={cn("w-3.5 h-3.5 shrink-0", labyLogoClass(s.client_infos.laby.partner))}
                                title="LabyMod"
                            />
                        )}
                    </Link>

                    {/* Séparateur */}
                    <div className="w-px h-4 bg-primary/20 flex-shrink-0" />

                    {/* Bouton retirer */}
                    <button
                        onClick={() => removeServer(s.id)}
                        className="flex items-center justify-center px-2.5 py-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer focus:outline-none"
                        title={t("common.remove")}
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}
