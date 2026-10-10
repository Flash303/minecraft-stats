import { useSyncExternalStore, type ReactNode } from "react"

interface ClientOnlyProps {
    children: ReactNode
    fallback?: ReactNode
}

/** Renders children only on the client (SSR-safe: fallback on the server). */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
    const isClient = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    )

    return isClient ? <>{children}</> : <>{fallback}</>
}
