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
