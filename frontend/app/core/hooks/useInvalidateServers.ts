import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SERVERS_QUERY_KEY, SERVERS_SEARCH_QUERY_KEY } from "@/core/lib/query-keys"

/**
 * Returns a callback that invalidates the global server list caches
 * (home + Ctrl+K search) to force a client refetch.
 *
 * Call it after any mutation that changes the list or its content:
 * add, delete, rename, IP/favicon change, visibility.
 */
export function useInvalidateServers() {
    const queryClient = useQueryClient()

    return useCallback(() => {
        queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: SERVERS_SEARCH_QUERY_KEY })
    }, [queryClient])
}
