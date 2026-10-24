/**
 * Shared TanStack Query keys for the server list.
 *
 * Centralized here to avoid duplicated magic strings (typos, partial renames):
 * every read/write/invalidation of these caches must go through these
 * constants.
 */

/** Global server list (home, `include_stats=true`), seeded by SSR. */
export const SERVERS_QUERY_KEY = ["servers"] as const

/**
 * Ctrl+K search cache prefix.
 * The full key is `[..., refreshCounter]`; prefix invalidation (without
 * `exact: true`) covers every generation.
 */
export const SERVERS_SEARCH_QUERY_KEY = ["servers-search"] as const
