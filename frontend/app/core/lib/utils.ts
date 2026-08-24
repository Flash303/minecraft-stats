import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
