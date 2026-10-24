import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { resolveProtocolVersion } from "./minecraft-protocols"
import { translate, type Language } from "./i18n"

/** Normalizes a free-form language string to an i18n `Language` (default: fr). */
function acceptableLanguage(language: string | undefined | null): Language {
    const langs: Language[] = ["fr", "en", "es", "it", "de", "pt", "ru", "pl", "zh-CN", "ja", "ko", "nl"]
    return (langs as string[]).includes(language ?? "") ? (language as Language) : "fr"
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const HTML_ESCAPES: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
}

export function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch])
}

export function getServerIp(ip: string, port: number, type?: string) {
    let displayIp: string = `${ip}`;
    if (type === "bedrock") {
        if (port !== 19132) {
            displayIp = `${ip}:${port}`;
        }
    } else if (port !== 25565) {
        displayIp = `${ip}:${port}`;
    }

    const fullIp = `${ip}:${port}`;
    return { displayIp, fullIp };
}

export function copyServerIp(ip: string, port: number, type?: string): Promise<void> {
    const { displayIp } = getServerIp(ip, port, type);
    return navigator.clipboard.writeText(displayIp);
}

/**
 * Formats a number (player counters, stats) DETERMINISTICALLY.
 *
 * `Intl.NumberFormat` is intentionally NOT used here: for the fr-FR locale,
 * Node (server) and browser ICU produce different thousands separators
 * (U+202F narrow no-break space vs U+00A0 no-break space), causing hydration
 * error #418 between the SSR HTML and the client render. By forcing a single
 * separator per language, both renders produce strictly identical strings.
 */
export function formatNumber(language: string | undefined | null, value: number): string {
    const separator = language === "fr" ? "\u202F" : ","
    const negative = value < 0
    const digits = String(Math.round(Math.abs(value)))
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return negative ? `-${grouped}` : grouped
}

/**
 * Deterministic date formatting (SERVER + CLIENT produce identical output),
 * unlike `Date#toLocaleDateString(locale)` whose ICU data differs between Node
 * and the browser (month names, ordering) and can break hydration (#418).
 * Month names and the format template come from the translation files
 * (common.months / common.dateFormat).
 *
 * The date is read in UTC: `getDate()`/`getMonth()` use the local timezone,
 * which differs between the SSR server (UTC) and the browser (e.g.
 * Europe/Paris), making the SSR HTML and client render diverge for timestamps
 * near midnight (hydration error #418 on the server page).
 */
export function formatDate(timestamp: number, language: string | undefined | null): string {
    const lang = acceptableLanguage(language)
    const d = new Date(timestamp)
    const day = d.getUTCDate()
    const year = d.getUTCFullYear()
    const month = translate(lang, `common.months.${d.getUTCMonth()}`)
    const template = translate(lang, "common.dateFormat")
    return template
        .replaceAll("{{day}}", String(day))
        .replaceAll("{{month}}", month)
        .replaceAll("{{year}}", String(year))
}

export function parseMinecraftVersionRange(versionName: string): [string, string] | null {
    // This regex matches version-like strings such as 1.8, 1.8.9, 1.21.11
    // It is quite permissive as Minecraft versioning is complex.
    const re = /\d+\.\d+(?:\.\d+)?/g;
    const matches = versionName.match(re);

    if (!matches || matches.length === 0) {
        return null;
    }

    const first = matches[0];
    const last = matches[matches.length - 1];

    return [first, last];
}

export function formatMinecraftVersion(versionName: string | null | undefined): string | null {
    if (!versionName) return null;
    const range = parseMinecraftVersionRange(versionName);
    // No `X.Y(.Z)` pattern: a custom version name (e.g. "Online: 12136") —
    // NEVER return the raw string, to avoid rendering arbitrary text
    // controlled by the server operator in badges.
    if (!range) {
        return null;
    }
    if (range[0] === range[1]) {
        return range[0];
    }

    return `${range[0]} - ${range[1]}`;
}

/**
 * Displayable version for a server: first the declared version (`last_version`
 * normalized by `formatMinecraftVersion`), then — when it is a custom name
 * without a version pattern — the network protocol number
 * (`last_protocol_version`, reliable because it comes from the handshake and
 * cannot be customized as free text).
 *
 * @returns `null` when nothing is displayable (sentinel protocol <= 0 such as
 * maintenance, unknown protocol, or Bedrock server without a readable
 * version): callers must then hide the badge / show "Unknown version".
 */
export function resolveServerVersion(
    versionName: string | null | undefined,
    protocolVersion: number | null | undefined,
    serverType?: string | null,
): string | null {
    return formatMinecraftVersion(versionName) ?? resolveProtocolVersion(protocolVersion, serverType);
}
