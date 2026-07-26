import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
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
