/**
 * Centralized client-side server search.
 *
 * Zero-dependency "hybrid" matcher used by every surface that searches
 * servers (home list, Ctrl+K suggestions, admin, account) so results are
 * filtered AND ranked the same way everywhere.
 *
 * Pipeline (industry-standard for small client-side catalogs):
 * 1. Normalize: strip Minecraft color codes, NFD + remove diacritics,
 *    lowercase, non-alphanumerics (unicode-aware, so CJK still works).
 * 2. Tokenize on whitespace. ALL tokens must match (AND semantics), each
 *    token matching the name OR the endpoint (`ip` / `ip:port`).
 * 3. Score per token with strictly ordered tiers (bonuses can never bridge
 *    a tier gap), then sum across tokens:
 *      name exact (100) > endpoint exact (95) > name prefix (80) >
 *      endpoint prefix (70) > name word-prefix (60) >
 *      endpoint segment-prefix, e.g. "hypixel" in "mc.hypixel.net" (55) >
 *      name substring (40) > endpoint substring (30) >
 *      fuzzy, 1 edit on words of 5+ letters, Damerau (transpositions) (<=10)
 *    Within a tier: longer query token wins, earlier position wins,
 *    shorter name wins (final tie-break).
 * 4. Fuzzy tolerance is intentionally limited to a single edit on tokens
 *    of 5+ letters, name field only: typos in IPs/ports never fuzzy-match.
 */
export interface SearchableServer {
    name: string;
    ip: string;
    port?: number | string | null | undefined;
}

export interface ServerMatch<T> {
    server: T;
    score: number;
}

const MIN_TOKEN_LENGTH_FOR_FUZZY = 5;
const MAX_FUZZY_EDITS = 1;

const MC_COLOR_CODE_RE = /§[0-9a-fk-or]/gi;
const DIACRITICS_RE = /\p{M}+/gu;
const NON_ALNUM_RE = /[^\p{L}\p{N}]+/gu;
const WHITESPACE_RE = /\s+/g;

// Tier bases. Gaps are >= 10; every bonus below is capped so tiers never overlap.
const SCORE = {
    nameExact: 100,
    endpointExact: 95,
    namePrefix: 80,
    endpointPrefix: 70,
    nameWordPrefix: 60,
    endpointSegmentPrefix: 55,
    nameSubstring: 40,
    endpointSubstring: 30,
    fuzzyBase: 10,
} as const;

const MAX_LENGTH_BONUS = 4;
const MAX_POSITION_BONUS = 4;
const MAX_SHORT_NAME_BONUS = 2;
const SHORT_NAME_REFERENCE_LENGTH = 50;

/** Normalize free text (server names, query tokens): "Hôtel-Craft §aFR" -> "hotel craft fr". */
export function normalizeSearchText(value: string): string {
    return value
        .replace(MC_COLOR_CODE_RE, "")
        .normalize("NFD")
        .replace(DIACRITICS_RE, "")
        .toLowerCase()
        .replace(NON_ALNUM_RE, " ")
        .trim()
        .replace(WHITESPACE_RE, " ");
}

function normalizeEndpoint(value: string): string {
    return value.toLowerCase().trim();
}

function buildEndpoint(server: SearchableServer): { full: string; ip: string; segments: string[] } {
    const ip = normalizeEndpoint(server.ip);
    const port = server.port ?? "";
    const full = port === "" || port === null ? ip : `${ip}:${port}`;
    const segments = full.split(/[.:]/).filter(Boolean);
    return { full, ip, segments };
}

/**
 * Damerau-Levenshtein (optimal string alignment: supports transpositions,
 * the most common typo, e.g. "hypixle" vs "hypixel") capped at `maxDistance`
 * with early exit. Inputs are short (single words), so the O(n*m) matrix
 * on three rolling rows is negligible.
 */
function editDistanceCapped(a: string, b: string, maxDistance: number): number {
    const n = a.length;
    const m = b.length;
    if (Math.abs(n - m) > maxDistance) return maxDistance + 1;
    if (n === 0) return m;
    if (m === 0) return n;

    let prevPrev = new Array<number>(m + 1);
    let prev = new Array<number>(m + 1);
    let curr = new Array<number>(m + 1);
    for (let j = 0; j <= m; j++) prev[j] = j;

    for (let i = 1; i <= n; i++) {
        curr[0] = i;
        let rowMin = i;
        for (let j = 1; j <= m; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let best = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                best = Math.min(best, prevPrev[j - 2] + 1);
            }
            curr[j] = best;
            if (best < rowMin) rowMin = best;
        }
        if (rowMin > maxDistance) return maxDistance + 1;
        const tmp = prevPrev;
        prevPrev = prev;
        prev = curr;
        curr = tmp;
    }
    return prev[m];
}

function lengthBonus(token: string): number {
    return Math.min(token.length, MAX_LENGTH_BONUS);
}

function positionBonus(index: number, fullLength: number): number {
    if (fullLength === 0) return 0;
    return Math.round(MAX_POSITION_BONUS * (1 - index / fullLength));
}

/**
 * Fuzzy fallback for ONE token against the words of a name.
 * Returns 0 when not applicable (short token) or beyond tolerance.
 * Also probes the word's leading window so typos made while typing a
 * prefix ("hypixl" for "hypixel...") still match.
 */
function fuzzyTokenScore(token: string, words: readonly string[]): number {
    if (token.length < MIN_TOKEN_LENGTH_FOR_FUZZY) return 0;
    let best = 0;
    for (const word of words) {
        if (!word) continue;
        const candidates =
            word.length > token.length ? [word, word.slice(0, token.length)] : [word];
        for (let c = 0; c < candidates.length; c++) {
            const candidate = candidates[c];
            if (Math.abs(candidate.length - token.length) > MAX_FUZZY_EDITS) continue;
            const distance = editDistanceCapped(token, candidate, MAX_FUZZY_EDITS);
            if (distance <= MAX_FUZZY_EDITS) {
                // Prefix-window hits describe typing typos: score them slightly higher.
                const score = SCORE.fuzzyBase - 3 * distance + (c === 1 ? 1 : 0);
                if (score > best) best = score;
            }
        }
    }
    return best;
}

/**
 * Best score of a single normalized token against one server.
 * Returns 0 when the token matches neither the name nor the endpoint
 * (which excludes the server, since tokens are AND-ed).
 */
function scoreToken(
    token: string,
    nameFull: string,
    nameWords: readonly string[],
    endpoint: { full: string; ip: string; segments: string[] }
): number {
    if (!token) return 0;

    const index = nameFull.indexOf(token);
    const isWordPrefix = nameWords.some((w) => w.startsWith(token));

    // Exact full-name hit (only possible for single-token queries).
    if (nameFull === token) return SCORE.nameExact;

    if (nameFull.startsWith(token)) return SCORE.namePrefix + lengthBonus(token);
    if (endpoint.full.startsWith(token) && token.length >= 2)
        return SCORE.endpointPrefix + lengthBonus(token);

    if (isWordPrefix) return SCORE.nameWordPrefix + lengthBonus(token);
    if (endpoint.segments.some((seg) => seg.startsWith(token)))
        return SCORE.endpointSegmentPrefix + lengthBonus(token);

    if (index >= 0)
        return SCORE.nameSubstring + lengthBonus(token) + positionBonus(index, nameFull.length);

    const endpointIndex = endpoint.full.indexOf(token);
    if (endpointIndex >= 0)
        return SCORE.endpointSubstring + lengthBonus(token) + positionBonus(endpointIndex, endpoint.full.length);

    // Last resort: typo tolerance on the name only, never on IPs/ports.
    return fuzzyTokenScore(token, nameWords);
}

function scoreServer(totalTokens: string[], rawQuery: string, server: SearchableServer): number {
    const nameFull = normalizeSearchText(server.name);
    const nameWords = nameFull === "" ? [] : nameFull.split(" ");
    const endpoint = buildEndpoint(server);

    // Typing a full address (or bare IP) expresses exact intent: top rank.
    const raw = rawQuery.toLowerCase().trim();
    if (raw !== "" && (raw === endpoint.full || raw === endpoint.ip)) {
        return SCORE.endpointExact + SHORT_NAME_REFERENCE_LENGTH;
    }

    let total = 0;
    for (const token of totalTokens) {
        const part = scoreToken(token, nameFull, nameWords, endpoint);
        if (part <= 0) return 0; // AND semantics: every token must match.
        total += part;
    }
    // Final tie-break: all else equal, the shorter (more "to the point") name wins.
    total += MAX_SHORT_NAME_BONUS * (1 - Math.min(nameFull.length, SHORT_NAME_REFERENCE_LENGTH) / SHORT_NAME_REFERENCE_LENGTH);
    return total;
}

/**
 * Ranked `{ server, score }` matches for a query. Empty/blank queries and
 * queries with no searchable content return every server with score 0 in
 * input order (never a dead-end).
 */
export function matchServers<T extends SearchableServer>(servers: readonly T[], query: string): ServerMatch<T>[] {
    const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
    if (tokens.length === 0) {
        return servers.map((server) => ({ server, score: 0 }));
    }
    const matches: ServerMatch<T>[] = [];
    for (const server of servers) {
        const score = scoreServer(tokens, query, server);
        if (score > 0) matches.push({ server, score });
    }
    matches.sort((a, b) => b.score - a.score); // stable: ties keep input order.
    return matches;
}

/** Filter + rank servers for a query. Empty query returns a copy in input order. */
export function searchServers<T extends SearchableServer>(servers: readonly T[], query: string): T[] {
    return matchServers(servers, query).map((m) => m.server);
}
