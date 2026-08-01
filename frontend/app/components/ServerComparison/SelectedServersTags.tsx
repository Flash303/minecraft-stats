import { X } from "lucide-react"
import type { Server } from "@/lib/api"

interface SelectedServersTagsProps {
    selectedServers: Server[]
    removeServer: (id: number) => void
}

export function SelectedServersTags({ selectedServers, removeServer }: SelectedServersTagsProps) {
    if (selectedServers.length === 0) return null

    return (
        <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
            {selectedServers.map((s) => (
                <div 
                    key={s.id} 
                    className="flex items-center gap-2 bg-indigo-500/5 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-3.5 py-1.5 rounded-xl text-xs border border-indigo-500/10 dark:border-indigo-500/20 shadow-xs hover:border-indigo-500/35 transition-colors"
                >
                    {s.last_favicon && (
                        <img 
                            src={s.last_favicon} 
                            className="h-4.5 w-4.5 rounded-md object-cover shadow-xs" 
                            alt="" 
                        />
                    )}
                    <span className="font-bold">{s.name}</span>
                    <button 
                        onClick={() => removeServer(s.id)}
                        className="hover:text-rose-500 transition-colors ml-1 cursor-pointer focus:outline-none"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    )
}
