import { translate, type Language } from "@/core/lib/i18n";
import { APP_URL } from "@/core/lib/config";

export const DEFAULT_LANGUAGE: Language = "fr";

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
    "fr", "en", "es", "it", "de", "pt", "ru", "pl", "zh-CN", "ja", "ko", "nl",
]);

function isSupportedLanguage(lang: unknown): lang is Language {
    return typeof lang === "string" && SUPPORTED_LANGUAGES.has(lang);
}

/**
 * Langue résolue côté serveur par le loader root (cookie puis Accept-Language).
 * Utilisée par les meta() SSR pour rendre title/description dans la bonne langue.
 *
 * Attention : dans les meta(), les matches React Router exposent les données
 * sous `loaderData` (pas `data`). Lire `.data` renvoie toujours `undefined` et
 * force le fallback français — puis des clés i18n brutes côté client quand le
 * dictionnaire français n'y est pas chargé.
 */
export function resolveMetaLanguage(
    matches: Array<{ id?: string; loaderData?: unknown }> | undefined
): Language {
    const rootData = matches?.find((m) => m.id === "root")?.loaderData as
        | { serverLanguage?: unknown }
        | undefined;
    const lang = rootData?.serverLanguage ?? DEFAULT_LANGUAGE;
    return isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

/**
 * Traduction sûre pour les balises SEO : ne renvoie JAMAIS la clé brute.
 * Chaîne de fallback : langue demandée → langue par défaut → chaîne vide.
 * Une clé i18n dans un <title> serait indexée telle quelle par Google.
 */
export function translateMeta(
    lang: Language,
    path: string,
    replacements?: Record<string, string>
): string {
    const hit = translate(lang, path, replacements);
    if (hit !== path) return hit;
    if (lang !== DEFAULT_LANGUAGE) {
        const fallback = translate(DEFAULT_LANGUAGE, path, replacements);
        if (fallback !== path) return fallback;
    }
    return "";
}

/** Titre suffixé du nom du site, ex. "Comparaison de serveurs | Minecraft-Stats". */
export function siteTitle(lang: Language, titleKey: string): string {
    return `${translateMeta(lang, titleKey)} | Minecraft-Stats`;
}

/** Tronque une description au-delà de `max` caractères, sans couper en plein mot. */
export function truncateDescription(text: string, max = 157): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Balise canonical vers l'URL officielle de la page (lutte contre le duplicate content). */
export function canonicalLink(path: string) {
    return { tagName: "link", rel: "canonical", href: `${APP_URL}${path}` } as const;
}

/** Balises title/description + Open Graph + Twitter pour une page statique.
 * Jeu complet et autosuffisant : le meta() de la route feuille remplace celui
 * du root, donc chaque page doit déclarer tous ses tags elle-même. */
export function staticPageMeta(opts: { title: string; description: string; path: string }) {
    const url = `${APP_URL}${opts.path}`;
    const image = `${APP_URL}/opengraph.webp`;
    return [
        { title: opts.title },
        { name: "description", content: opts.description },
        canonicalLink(opts.path),
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Minecraft-Stats" },
        { property: "og:title", content: opts.title },
        { property: "og:description", content: opts.description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "twitter:card", content: "summary_large_image" },
        { property: "twitter:title", content: opts.title },
        { property: "twitter:description", content: opts.description },
        { property: "twitter:image", content: image },
    ];
}
