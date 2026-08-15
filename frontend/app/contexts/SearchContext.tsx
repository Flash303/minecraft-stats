import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface SearchContextType {
    searchQuery: string
    setSearchQuery: (query: string) => void
    refreshCounter: number
    triggerRefresh: () => void
}

const SearchContext = createContext<SearchContextType | undefined>(undefined)

export function SearchProvider({ children }: { children: ReactNode }) {
    const [searchQuery, setSearchQuery] = useState("")
    const [refreshCounter, setRefreshCounter] = useState(0)

    const triggerRefresh = useCallback(() => {
        setRefreshCounter(prev => prev + 1)
    }, [])

    return (
        <SearchContext.Provider value={{ searchQuery, setSearchQuery, refreshCounter, triggerRefresh }}>
            {children}
        </SearchContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSearch() {
    const context = useContext(SearchContext)
    if (context === undefined) {
        throw new Error("useSearch must be used within a SearchProvider")
    }
    return context
}
