import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { translate, type Language } from "./i18n"

/** Normalise une langue libre en une `Language` du registre i18n (défaut: fr). */
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
 * Formate un nombre (compteurs de joueurs, stats) de façon DÉTERMINISTE.
 *
 * On n'utilise PAS `Intl.NumberFormat` ici : pour la locale fr-FR, l'ICU de
 * Node (serveur) et celui du navigateur sortent des caractères de séparation
 * des milliers différents (U+202F espace fine vs U+00A0 espace insécable),
 * ce qui provoque une erreur d'hydratation #418 entre le HTML SSR et le rendu
 * client. En imposant un séparateur unique par langue, les deux rendus
 * (serveur et client) sortent des chaînes strictement identiques.
 */
export function formatNumber(language: string | undefined | null, value: number): string {
    const separator = language === "fr" ? "\u202F" : ","
    const negative = value < 0
    const digits = String(Math.round(Math.abs(value)))
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator)
    return negative ? `-${grouped}` : grouped
}

/**
 * Date déterministe (SERVEUR + CLIENT identiques), contrairement à
 * `Date#toLocaleDateString(locale)` dont l'ICU diffère entre Node et le
 * navigateur (noms de mois, ordre) et peut casser l'hydratation (#418).
 * Les noms de mois et le gabarit de format viennent des fichiers de
 * traduction (common.months / common.dateFormat).
 */
export function formatDate(timestamp: number, language: string | undefined | null): string {
    const lang = acceptableLanguage(language)
    const d = new Date(timestamp)
    const day = d.getDate()
    const year = d.getFullYear()
    const month = translate(lang, `common.months.${d.getMonth()}`)
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

export function formatMinecraftVersion(versionName: string | null | undefined, stripColors = true): string | null {
    if (!versionName) return null;
    const range = parseMinecraftVersionRange(versionName);
    if (!range) {
        // Fallback to original if parsing fails
        if (stripColors) {
            return versionName.replace(/(§x(?:§[0-9a-fA-F]){6}|§[0-9a-fk-orA-FK-OR]|&#[0-9a-fA-F]{6}|&f{[^}]+};|&s{[^}]+};|&h{[^}]*};)/g, '');
        }
        return versionName;
    }
    if (range[0] === range[1]) {
        return range[0];
    }
    
    return `${range[0]} - ${range[1]}`;
}
