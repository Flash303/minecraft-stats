import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { SERVERS_QUERY_KEY, SERVERS_SEARCH_QUERY_KEY } from "@/core/lib/query-keys"

/**
 * Retourne un callback qui invalide les caches globaux de la liste des
 * serveurs (home + recherche Ctrl+K) pour forcer un refetch client.
 *
 * À appeler après toute mutation qui change la liste ou son contenu :
 * ajout, suppression, renommage, changement d'IP/favicon, visibilité.
 */
export function useInvalidateServers() {
    const queryClient = useQueryClient()

    return useCallback(() => {
        queryClient.invalidateQueries({ queryKey: SERVERS_QUERY_KEY })
        queryClient.invalidateQueries({ queryKey: SERVERS_SEARCH_QUERY_KEY })
    }, [queryClient])
}
