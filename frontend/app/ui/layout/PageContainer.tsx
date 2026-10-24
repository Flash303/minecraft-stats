import type { ReactNode } from "react"
import { cn } from "@/core/lib/utils"

const WIDTHS = {
    /** Default width for focused pages (detail, compare, account, footer). */
    content: "max-w-6xl",
    /** Airier container for the home page (hero, list, FAQ). */
    wide: "max-w-7xl",
    /** Long-form content (legal pages, articles). */
    prose: "max-w-4xl",
} as const

interface PageContainerProps {
    children: ReactNode
    size?: keyof typeof WIDTHS
    className?: string
    id?: string
}

/**
 * Single source of truth for horizontal page gutters.
 *
 * Page bodies go through this component so their left/right edges line up at
 * every breakpoint. Padding scales with the viewport: 1rem on phones, 1.5rem
 * on tablets, 2rem on desktop. The header stays full-width; only the width
 * cap varies per page via `size`.
 */
export function PageContainer({ children, size = "content", className, id }: PageContainerProps) {
    return (
        <div id={id} className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", WIDTHS[size], className)}>
            {children}
        </div>
    )
}
