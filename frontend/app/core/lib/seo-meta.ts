import { translate, type Language } from "@/core/lib/i18n";
import { APP_URL } from "@/core/lib/config";
import { formatNumber } from "./utils";
import type { Server } from "@/core/lib/api";

export const DEFAULT_LANGUAGE: Language = "fr";

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set([
    "fr", "en", "es", "it", "de", "pt", "ru", "pl", "zh-CN", "ja", "ko", "nl",
]);

function isSupportedLanguage(lang: unknown): lang is Language {
    return typeof lang === "string" && SUPPORTED_LANGUAGES.has(lang);
}

export function resolveMetaLanguage(
    matches: Array<{ id?: string; loaderData?: unknown }> | undefined
): Language {
    const rootData = matches?.find((m) => m.id === "root")?.loaderData as
        | { serverLanguage?: unknown }
        | undefined;
    const lang = rootData?.serverLanguage ?? DEFAULT_LANGUAGE;
    return isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

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

export function siteTitle(lang: Language, titleKey: string): string {
    return `${translateMeta(lang, titleKey)} | Minecraft-Stats`;
}

export interface DocumentMeta {
    title: string;
    description: string;
}

export interface RouteMetaHandle {
    getDocumentMeta?: (data: unknown, lang: Language) => DocumentMeta | null;
    syncLiveTitle?: boolean;
}

export function applyDocumentMeta(meta: DocumentMeta): void {
    document.title = meta.title;
    document.head.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
    document.head.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
    document.head.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
    document.head.querySelector('meta[name="twitter:title"]')?.setAttribute("content", meta.title);
    document.head.querySelector('meta[name="twitter:description"]')?.setAttribute("content", meta.description);
}

export function getServerDocumentMeta(server: Server | null, lang: Language): DocumentMeta {
    if (!server) {
        return {
            title: translateMeta(lang, "seo.notFoundTitle"),
            description: translateMeta(lang, "seo.notFoundDescription"),
        };
    }
    const title = `${server.name} - ${translateMeta(lang, "seo.serverTitleSuffix")}`;
    const isOnline = server.last_status === "online";
    const players = isOnline ? formatNumber(lang, server.last_connected ?? 0) : "0";
    const playersText = isOnline
        ? ` ${translateMeta(lang, "seo.statusOnline", { count: players })}`
        : server.last_status === "offline"
          ? ` ${translateMeta(lang, "seo.statusOffline")}`
          : "";
    const description = `${translateMeta(lang, "seo.serverDescription", { name: server.name, ip: server.ip })}${playersText}`;
    return { title, description };
}

export function truncateDescription(text: string, max = 157): string {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function canonicalLink(path: string) {
    return { tagName: "link", rel: "canonical", href: `${APP_URL}${path}` } as const;
}

export const DEFAULT_FAVICON_URL = "/logo.webp";

/**
 * Same-origin URL serving the server's Minecraft icon.
 * Goes through the frontend `/api/favicon/:id` route (301 to the backend
 * icon endpoint) instead of hitting the backend directly: no cross-origin
 * request, consistent with the app CSP, standard browser caching.
 * No `type` attribute on purpose: the backend serves `image/png` when the
 * server has a custom icon and `image/webp` (default) otherwise.
 */
export function getServerFaviconUrl(serverId: number | string): string {
    return `/api/favicon/${serverId}`;
}

export function serverFaviconLink(serverId: number | string) {
    return {
        tagName: "link",
        rel: "icon",
        href: getServerFaviconUrl(serverId),
    } as const;
}

/**
 * Client-side live sync of `<link rel="icon">` for the current server.
 * The SSR `meta()` already renders the right link for first paint/crawlers;
 * this covers client-side navigations and late server updates (the loader
 * data can arrive after hydration) and restores the default icon on cleanup
 * so leaving the page never leaks the previous server's icon.
 * Returns a cleanup function to run on unmount/id change.
 */
export function syncServerFavicon(serverId: number | string): () => void {
    if (typeof document === "undefined") return () => {};
    const href = getServerFaviconUrl(serverId);
    const links = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
    );
    const previous = links.map(
        (link) => link.getAttribute("href") ?? DEFAULT_FAVICON_URL
    );
    let created: HTMLLinkElement | null = null;
    if (links.length === 0) {
        created = document.createElement("link");
        created.rel = "icon";
        created.href = href;
        document.head.appendChild(created);
    } else {
        for (const link of links) link.href = href;
    }
    return () => {
        if (created) {
            created.remove();
        } else {
            links.forEach((link, i) => {
                link.href = previous[i] ?? DEFAULT_FAVICON_URL;
            });
        }
    };
}

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
