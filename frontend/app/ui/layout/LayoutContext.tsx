import { createContext, useContext } from "react"
import type { ReactNode } from "react"

export interface LayoutContextType {
    setOnRefresh: (fn: (() => void) | undefined) => void
    setIsLoading: (loading: boolean | undefined) => void
    setLeftContent: (content: ReactNode | undefined) => void
}

export const LayoutContext = createContext<LayoutContextType | null>(null)

export function useLayoutConfig() {
    const context = useContext(LayoutContext)
    if (!context) {
        throw new Error("useLayoutConfig must be used within a Layout component")
    }
    return context
}
