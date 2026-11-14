/**
 * Single source of truth for server categories & languages (declared by owners).
 *
 * Backend enums (authoritative, lowercase):
 * - server_category: survival,creative,faction,skyblock,prison,minigames,bedwars,
 *   skywars,rpg,adventure,hardcore,anarchy,smp,pixelmon,citybuild,oneblock,boxed,
 *   roleplay,practice
 * - server_language: fr,en,es,de,pt,it,nl,pl,ru,zh,ja,ko,ar,tr,he,cs,fi,vi,sr,ro,
 *   ka,da
 *
 * Server language codes are shared verbatim with the API (including the UI
 * locale `zh`): no mapping layer.
 * Laby/Lunar `supported_languages` / `languages` from client_infos are EXTERNAL
 * data — never mix them with these owner-declared values.
 */

export const SERVER_CATEGORIES = [
    "survival",
    "creative",
    "faction",
    "skyblock",
    "prison",
    "minigames",
    "bedwars",
    "skywars",
    "rpg",
    "adventure",
    "hardcore",
    "anarchy",
    "smp",
    "pixelmon",
    "citybuild",
    "oneblock",
    "boxed",
    "roleplay",
    "practice",
] as const;

export type ServerCategory = (typeof SERVER_CATEGORIES)[number];

/** API codes (backend `server_language`). */
export const SERVER_LANGUAGES_API = [
    "fr",
    "en",
    "es",
    "de",
    "pt",
    "it",
    "nl",
    "pl",
    "ru",
    "zh",
    "ja",
    "ko",
    "ar",
    "tr",
    "he",
    "cs",
    "fi",
    "vi",
    "sr",
    "ro",
    "ka",
    "da",
] as const;

export type ServerLanguageApi = (typeof SERVER_LANGUAGES_API)[string];

const CATEGORY_SET = new Set<string>(SERVER_CATEGORIES);
const LANGUAGE_SET = new Set<string>(SERVER_LANGUAGES_API);

function normalizeList(values: unknown, valid: Set<string>, map: (v: string) => string): string[] {
    if (!Array.isArray(values)) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of values) {
        if (typeof v !== "string") continue;
        const norm = map(v.trim());
        if (!valid.has(norm) || seen.has(norm)) continue;
        seen.add(norm);
        out.push(norm);
    }
    return out;
}

export function normalizeCategories(values: unknown): ServerCategory[] {
    return normalizeList(values, CATEGORY_SET, (v) => v.toLowerCase()) as ServerCategory[];
}

export function normalizeLanguages(values: unknown): string[] {
    return normalizeList(values, LANGUAGE_SET, (v) => v.toLowerCase());
}

function parseCsvParam(param: string | null, normalize: (v: unknown) => string[]): string[] {
    if (!param) return [];
    return normalize(param.split(",").map((s) => s.trim()).filter(Boolean));
}

export function parseCategoriesParam(param: string | null): ServerCategory[] {
    return parseCsvParam(param, normalizeCategories);
}

export function parseLanguagesParam(param: string | null): string[] {
    return parseCsvParam(param, normalizeLanguages);
}

export function serializeParam(values: readonly string[]): string | null {
    return values.length > 0 ? [...values].sort().join(",") : null;
}

/** Labels with graceful fallback when a locale file misses the key. */
function lookupLabel(key: string, t: (key: string) => string, fallback: string): string {
    const label = t(key);
    return !label || label.startsWith("taxonomy.") ? fallback : label;
}

export function getCategoryLabel(
    slug: string,
    t: (key: string) => string
): string {
    return lookupLabel(
        `taxonomy.categories.${slug}`,
        t,
        slug.charAt(0).toUpperCase() + slug.slice(1)
    );
}

const LANGUAGE_FALLBACK: Record<string, string> = {
    fr: "Français",
    en: "English",
    es: "Español",
    de: "Deutsch",
    pt: "Português",
    it: "Italiano",
    nl: "Nederlands",
    pl: "Polski",
    ru: "Русский",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
    ar: "العربية",
    tr: "Türkçe",
    he: "עברית",
    cs: "Čeština",
    fi: "Suomi",
    vi: "Tiếng Việt",
    sr: "Српски",
    ro: "Română",
    ka: "ქართული",
    da: "Dansk",
};

export function getLanguageLabel(
    apiCode: string,
    t: (key: string) => string
): string {
    const norm = apiCode.trim().toLowerCase();
    return lookupLabel(
        `taxonomy.languages.${norm}`,
        t,
        LANGUAGE_FALLBACK[norm] ?? norm.toUpperCase()
    );
}
