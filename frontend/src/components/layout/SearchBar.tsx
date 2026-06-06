import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { fetchServers } from "@/lib/api"
import type { Server } from "@/lib/api"
import { useAuth } from "@clerk/react"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { useLanguage } from "@/contexts/LanguageContext"

interface SearchBarProps {
    value?: string
    onChange?: (value: string) => void
    onSelect?: (server: Server) => void
    placeholder?: string
    className?: string
}

export function SearchBar({ value: propValue, onChange: propOnChange, onSelect, placeholder: propPlaceholder, className }: SearchBarProps) {
    const navigate = useNavigate()
    const { t } = useLanguage()
    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [allServers, setAllServers] = useState<Server[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [internalValue, setInternalValue] = useState("")
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    const placeholder = propPlaceholder || t("common.search")
    const value = propValue !== undefined ? propValue : internalValue
    const onChange = propOnChange || setInternalValue

    useEffect(() => {
        const loadAll = async () => {
            try {
                const token = isLoaded && isSignedIn ? await getToken() : undefined
                const data = await fetchServers(token ?? undefined)
                setAllServers(data)
            } catch (err) {
                console.error("Failed to load servers", err)
            }
        }
        if (isLoaded) loadAll()
    }, [isLoaded, isSignedIn, getToken])

    const filteredSuggestions = useMemo(() => {
        if (!value.trim()) return []
        return allServers.filter(s => 
            s.name.toLowerCase().includes(value.toLowerCase()) || 
            s.ip.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 5)
    }, [allServers, value])

    const handleSelect = useCallback((server: Server) => {
        if (onSelect) {
            onSelect(server)
        } else {
            onChange("")
            setShowSuggestions(false)
            navigate(`/server/${server.id}`)
        }
    }, [navigate, onChange, onSelect])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && filteredSuggestions.length > 0) {
            handleSelect(filteredSuggestions[0])
        }
    }

    // Listener global pour Ctrl+K
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <div className={cn("relative w-full max-w-sm group", className)} ref={containerRef}>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                <SearchIcon className="h-4 w-4" />
            </div>
            <Input
                ref={inputRef}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="pl-9 pr-14 h-9 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {value ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                        onClick={() => onChange("")}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                ) : (
                    <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                )}
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredSuggestions.map((s, idx) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left transition-colors",
                                idx === 0 && "bg-accent/50"
                            )}
                        >
                            {s.last_favicon ? (
                                <img src={s.last_favicon} className="h-5 w-5 rounded" alt="" />
                            ) : (
                                <div className="h-5 w-5 rounded bg-muted" />
                            )}
                            <div className="flex flex-col min-w-0">
                                <span className="text-xs font-medium line-clamp-1">{s.name}</span>
                                <span className="text-[9px] text-muted-foreground font-mono">{s.ip}</span>
                            </div>
                            {idx === 0 && (
                                <div className="ml-auto text-[9px] text-muted-foreground border px-1 rounded uppercase tracking-tighter font-sans">{t("common.enter")}</div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
