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
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [isMac, setIsMac] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    const placeholder = propPlaceholder || t("common.search")
    const value = propValue !== undefined ? propValue : internalValue
    const onChange = propOnChange || setInternalValue

    useEffect(() => {
        setSelectedIndex(0)
    }, [value])

    useEffect(() => {
        setIsMac(typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0)
        setIsMobile(typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, [])

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
        if (!showSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setShowSuggestions(true)
            return
        }

        if (e.key === 'Enter' && filteredSuggestions.length > 0) {
            e.preventDefault()
            const targetIndex = selectedIndex >= 0 && selectedIndex < filteredSuggestions.length ? selectedIndex : 0
            handleSelect(filteredSuggestions[targetIndex])
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        } else if (e.key === 'Escape') {
            e.preventDefault()
            setShowSuggestions(false)
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
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                <SearchIcon className="h-4.5 w-4.5" />
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
                className="pl-10 pr-14 h-10 bg-white dark:bg-zinc-900 border border-slate-250 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/10 rounded-xl transition-all shadow-sm font-medium text-xs text-slate-800 dark:text-zinc-200"
            />
            
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {value ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                        onClick={() => onChange("")}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                ) : !isMobile ? (
                    <kbd className="pointer-events-none hidden h-5 select-none items-center justify-center rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-1.5 font-sans text-[10px] font-medium text-slate-400 dark:text-zinc-500 shadow-xs sm:flex">
                        {isMac ? '⌘K' : 'Ctrl+K'}
                    </kbd>
                ) : null}
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white/95 dark:bg-zinc-950/95 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1">
                    {filteredSuggestions.map((s, idx) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer",
                                idx === selectedIndex ? "bg-primary/5 dark:bg-primary/10 text-primary" : "hover:bg-muted/60 text-slate-700 dark:text-zinc-300"
                            )}
                        >
                            {s.last_favicon ? (
                                <img src={s.last_favicon} className="h-6 w-6 rounded-md object-cover shadow-xs" alt="" />
                            ) : (
                                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center font-bold text-[10px] text-muted-foreground">MC</div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                                <span className={cn("text-xs font-bold line-clamp-1", idx === selectedIndex ? "text-primary-foreground dark:text-primary" : "text-slate-900 dark:text-zinc-100")}>{s.name}</span>
                                <span className="text-[9.5px] text-muted-foreground font-mono truncate leading-none mt-0.5">{s.ip}</span>
                            </div>
                            {idx === selectedIndex && (
                                <div className="text-[9px] text-primary/80 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded-md uppercase tracking-wide font-bold">{t("common.enter")}</div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
