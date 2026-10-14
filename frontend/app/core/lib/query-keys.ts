/**
 * Clés TanStack Query partagées pour la liste des serveurs.
 *
 * Centralisées ici pour éviter les chaînes magiques dupliquées (typos,
 * renommages partiels) : toute lecture/écriture/invalidation de ces caches
 * doit passer par ces constantes.
 */

/** Liste globale des serveurs (home, `include_stats=true`), amorcée par le SSR. */
export const SERVERS_QUERY_KEY = ["servers"] as const

/**
 * Préfixe du cache de la recherche Ctrl+K.
 * La clé complète est `[..., refreshCounter]` ; l'invalidation par préfixe
 * (sans `exact: true`) couvre toutes les générations.
 */
export const SERVERS_SEARCH_QUERY_KEY = ["servers-search"] as const
