import { createContext, useState, useCallback, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

interface SearchContextType {
    searchQuery: string
    setSearchQuery: (query: string) => void
    refreshCounter: number
    triggerRefresh: () => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export { SearchContext }

export function SearchProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState("")
    const [refreshCounter, setRefreshCounter] = useState(0)
    const queryClient = useQueryClient()

    const triggerRefresh = useCallback(() => {
        setRefreshCounter(prev => prev + 1)
        // Le nouveau serveur doit apparaître dans le Ctrl+K (SearchBar) et dans
        // la home : on invalide les deux caches pour forcer un refetch client.
        queryClient.invalidateQueries({ queryKey: ["servers"] })
        queryClient.invalidateQueries({ queryKey: ["servers-search"] })
    }, [queryClient])

    return (
        <SearchContext.Provider value={{ searchQuery, setSearchQuery, refreshCounter, triggerRefresh }}>
            {children}
        </SearchContext.Provider>
    )
}
