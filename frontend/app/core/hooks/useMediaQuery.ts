import { useSyncExternalStore } from "react"

/** Live media-query match (SSR-safe: always false on the server). */
export function useMediaQuery(query: string) {
    return useSyncExternalStore(
        (onChange) => {
            const result = matchMedia(query)
            result.addEventListener("change", onChange)
            return () => result.removeEventListener("change", onChange)
        },
        () => matchMedia(query).matches,
        () => false,
    )
}
