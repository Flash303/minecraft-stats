import type { ReactNode } from "react"
import { cn } from "@/core/lib/utils"

const WIDTHS = {
    /** Default reading width, aligned with the header, footer and list pages. */
    content: "max-w-6xl",
    /** Slightly wider container for dense dashboards. */
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
 * Every full-width section (header, footer, hero, page body) goes through this
 * component so their left/right edges line up at every breakpoint. Padding
 * scales with the viewport: 1rem on phones, 1.5rem on tablets, 2rem on desktop.
 */
export function PageContainer({ children, size = "content", className, id }: PageContainerProps) {
    return (
        <div id={id} className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", WIDTHS[size], className)}>
            {children}
        </div>
    )
}
