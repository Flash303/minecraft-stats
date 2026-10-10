import { useContext } from "react"
import { SearchContext } from "@/core/contexts/SearchContext"

export function useSearch() {
    const context = useContext(SearchContext)
    if (context === undefined) {
        throw new Error("useSearch must be used within a SearchProvider")
    }
    return context
}
