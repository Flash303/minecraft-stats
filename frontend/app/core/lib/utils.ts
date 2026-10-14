import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { resolveProtocolVersion } from "./minecraft-protocols"
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
 *
 * La date est lue en UTC : `getDate()`/`getMonth()` utilisent le fuseau local,
 * qui diffère entre le serveur SSR (UTC) et le navigateur (ex. Europe/Paris),
 * ce qui faisait diverger le HTML SSR et le rendu client pour les timestamps
 * proches de minuit (erreur d'hydratation #418 sur la page serveur).
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
    // Pas de motif `X.Y(.Z)` : nom de version custom (ex. "Online: 12136") —
    // on ne renvoie JAMAIS la chaîne brute pour éviter d'afficher du texte
    // arbitraire contrôlé par l'opérateur du serveur dans les badges.
    if (!range) {
        return null;
    }
    if (range[0] === range[1]) {
        return range[0];
    }

    return `${range[0]} - ${range[1]}`;
}

/**
 * Version affichable d'un serveur : d'abord la version déclarée (`last_version`
 * nettoyée par `formatMinecraftVersion`), puis — si c'est un nom custom sans
 * motif de version — le numéro de protocole réseau (`last_protocol_version`,
 * fiable car envoyé par le handshake, pas customisable en texte libre).
 *
 * @returns `null` quand rien d'affichable (protocole sentinelle <= 0 comme en
 * maintenance, protocole inconnu, ou serveur Bedrock sans version lisible) :
 * les appelants doivent alors masquer le badge / afficher "Version inconnue".
 */
export function resolveServerVersion(
    versionName: string | null | undefined,
    protocolVersion: number | null | undefined,
    serverType?: string | null,
): string | null {
    return formatMinecraftVersion(versionName) ?? resolveProtocolVersion(protocolVersion, serverType);
}
