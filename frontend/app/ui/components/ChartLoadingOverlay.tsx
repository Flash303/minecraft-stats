import type { ReactNode } from "react"

/** Dimmed overlay hosting chart loading states. */
export function ChartLoadingOverlay({ children }: { children: ReactNode }) {
    return (
        <div className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-[2px] transition-all duration-200">
            {children}
        </div>
    )
}

/** Standard spinner + label used while chart records load. */
export function ChartLoadingSpinner({ label }: { label: string }) {
    return (
        <>
            <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            <p className="text-muted-foreground animate-pulse text-sm font-medium">
                {label}
            </p>
        </>
    )
}
