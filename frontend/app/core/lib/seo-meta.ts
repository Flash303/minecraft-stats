import { translate, type Language } from "@/core/lib/i18n";
import { APP_URL } from "@/core/lib/config";

/**
 * Langue résolue côté serveur par le loader root (cookie puis Accept-Language).
 * Utilisée par les meta() SSR pour rendre title/description dans la bonne langue.
 */
export function resolveMetaLanguage(
    matches: Array<{ id?: string; data?: unknown }> | undefined
): Language {
    const rootData = matches?.find((m) => m.id === "root")?.data as
        | { serverLanguage?: Language }
        | undefined;
    return rootData?.serverLanguage ?? "fr";
}

/** Titre suffixé du nom du site, ex. "Comparaison de serveurs | Minecraft-Stats". */
export function siteTitle(lang: Language, titleKey: string): string {
    return `${translate(lang, titleKey)} | Minecraft-Stats`;
}

/** Tronque une description au-delà de `max` caractères, sans couper en plein mot. */
export function truncateDescription(text: string, max = 157): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Balises title/description + Open Graph + Twitter pour une page statique. */
export function staticPageMeta(opts: { title: string; description: string; path: string }) {
    const url = `${APP_URL}${opts.path}`;
    const image = `${APP_URL}/opengraph.webp`;
    return [
        { title: opts.title },
        { name: "description", content: opts.description },
        { property: "og:title", content: opts.title },
        { property: "og:description", content: opts.description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "twitter:card", content: "summary_large_image" },
        { property: "twitter:title", content: opts.title },
        { property: "twitter:description", content: opts.description },
        { property: "twitter:image", content: image },
    ];
}
