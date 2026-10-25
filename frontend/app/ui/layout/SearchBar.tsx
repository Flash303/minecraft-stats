import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/ui/components/input"
import { Button } from "@/ui/components/button"
import { fetchServers } from "@/core/lib/api"
import { ServerIcon } from "@/ui/components/ServerIcon"
import { lunarLogoClass, labyLogoClass } from "@/core/lib/theme-colors"
import type { Server } from "@/core/lib/api"
import { useAuth } from "@clerk/react"
import { cn } from "@/core/lib/utils"
import { useNavigate } from "react-router"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useSearch } from "@/core/hooks/useSearch"
import { SERVERS_QUERY_KEY, SERVERS_SEARCH_QUERY_KEY } from "@/core/lib/query-keys"
import { searchServers } from "@/core/lib/server-search"
import { MINUTE_MS } from "@/core/lib/time"

import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"

interface SearchBarProps {
    value?: string
    onChange?: (value: string) => void
    onSelect?: (server: Server) => void
    placeholder?: string
    className?: string
    /** Focus the input on mount (used by the compact header search overlay). */
    autoFocus?: boolean
}

export function SearchBar({ value: propValue, onChange: propOnChange, onSelect, placeholder: propPlaceholder, className, autoFocus }: SearchBarProps) {
    const navigate = useNavigate()
    const { t } = useLanguage()
    const { refreshCounter } = useSearch()

    const { getToken, isSignedIn, isLoaded } = useAuth()
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [internalValue, setInternalValue] = useState("")
    const [isFocused, setIsFocused] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const [isMac, setIsMac] = useState(false)
    const [isMobile, setIsMobile] = useState(false)

    const placeholder = propPlaceholder || t("common.search")
    const value = propValue !== undefined ? propValue : internalValue
    const onChange = propOnChange || setInternalValue

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedIndex(0)
    }, [value])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMac(typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0)
        setIsMobile(typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
    }, [])

    const queryClient = useQueryClient()
    const { data: allServers = [] } = useQuery({
        queryKey: [...SERVERS_SEARCH_QUERY_KEY, refreshCounter],
        queryFn: async () => {
            // Optimization: if the homepage already loaded the servers (via SSR
            // or client), reuse them UNLESS a refresh was requested (server
            // added): the ["servers"] cache is then invalidated and we must
            // refetch so the new server shows up in the Ctrl+K search.
            const cachedServers = queryClient.getQueryData<Server[]>(SERVERS_QUERY_KEY)
            const serversState = queryClient.getQueryState(SERVERS_QUERY_KEY)
            if (cachedServers && cachedServers.length > 0 && !serversState?.isInvalidated) {
                return cachedServers
            }
            
            const token = isLoaded && isSignedIn ? await getToken() : undefined
            return fetchServers(token ?? undefined, false)
        },
        enabled: isLoaded && isFocused,
        staleTime: MINUTE_MS,
    })

    const filteredSuggestions = useMemo(() => {
        if (!value.trim()) return []
        return searchServers(allServers, value).slice(0, 5)
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

    // Global Ctrl+K listener
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault()
                onChange("")
                setIsFocused(true)
                inputRef.current?.focus()
            }
        }
        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [onChange])

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
        <div className={cn("relative w-full max-w-sm group @container", className)} ref={containerRef}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10">
                <SearchIcon className="h-4.5 w-4.5" />
            </div>
            <Input
                ref={inputRef}
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value)
                    setShowSuggestions(true)
                }}
                onFocus={() => {
                    setShowSuggestions(true)
                    setIsFocused(true)
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                aria-label={placeholder}
                role="combobox"
                aria-expanded={showSuggestions && filteredSuggestions.length > 0}
                aria-autocomplete="list"
                autoComplete="off"
                enterKeyHint="search"
                className="pl-10 pr-10 @min-[20rem]:pr-14 h-10 bg-card border border-border focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/10 rounded-xl transition-all shadow-sm font-medium text-base sm:text-xs text-foreground"
            />
            
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                {value ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-transparent text-muted-foreground hover:text-foreground"
                        onClick={() => onChange("")}
                        aria-label={t("common.remove")}
                    >
                        <X className="h-3.5 w-3.5" />
                    </Button>
                ) : !isMobile ? (
                    <kbd className="pointer-events-none hidden h-5 select-none items-center justify-center rounded border border-border bg-muted px-1.5 font-sans text-2xs font-medium text-muted-foreground shadow-xs @min-[20rem]:flex">
                        {isMac ? '⌘K' : 'Ctrl+K'}
                    </kbd>
                ) : null}
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-popover/95 border border-border/80 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 p-1">
                    {filteredSuggestions.map((s, idx) => (
                        <button
                            key={s.id}
                            onClick={() => handleSelect(s)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors cursor-pointer",
                                idx === selectedIndex ? "bg-primary/5 dark:bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
                            )}
                        >
                            <ServerIcon 
                                serverId={s.id}
                                className="h-6 w-6 rounded-md object-cover shadow-xs flex-shrink-0" 
                                alt="" 
                            />
                            <div className="flex flex-col min-w-0 flex-1 gap-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={cn("text-xs font-bold line-clamp-1", idx === selectedIndex ? "text-primary" : "text-foreground")}>{s.name}</span>
                                    {s.client_infos?.lunar && <LunarLogo className={cn("w-2.5 h-2.5 shrink-0", lunarLogoClass(s.client_infos.lunar.partner))} />}
                                    {s.client_infos?.laby && <LabyLogo className={cn("w-2.5 h-2.5 shrink-0", labyLogoClass(s.client_infos.laby.partner))} />}
                                </div>
                                <span className="text-2xs text-muted-foreground font-mono truncate leading-none">{s.ip}</span>
                            </div>
                            {idx === selectedIndex && (
                                <div className="text-2xs text-primary/80 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded-md uppercase tracking-wide font-bold">{t("common.enter")}</div>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
