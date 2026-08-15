import { MINECRAFT_COLORS, OBFUSCATION_CHARS } from "./constants";

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flattenMotd(node: any, inherited: any = {}): string {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(n => flattenMotd(n, inherited)).join("");
    if (!node || typeof node !== "object") return "";
    if (node.description) return flattenMotd(node.description, inherited);

    const current = { ...inherited };
    let res = "";

    let needsReset = false;
    if (node.color && node.color !== inherited.color) needsReset = true;
    if (node.font && node.font !== inherited.font) needsReset = true;
    if (node.shadow_color !== undefined && node.shadow_color !== inherited.shadow_color) needsReset = true;
    if (node.bold === false && inherited.bold) needsReset = true;
    if (node.italic === false && inherited.italic) needsReset = true;
    if (node.underlined === false && inherited.underlined) needsReset = true;
    if (node.strikethrough === false && inherited.strikethrough) needsReset = true;
    if (node.obfuscated === false && inherited.obfuscated) needsReset = true;

    if (node.color) current.color = node.color;
    if (node.font) current.font = node.font;
    if (node.shadow_color !== undefined) current.shadow_color = node.shadow_color;
    if (node.bold !== undefined) current.bold = node.bold;
    if (node.italic !== undefined) current.italic = node.italic;
    if (node.underlined !== undefined) current.underlined = node.underlined;
    if (node.strikethrough !== undefined) current.strikethrough = node.strikethrough;
    if (node.obfuscated !== undefined) current.obfuscated = node.obfuscated;

    if (needsReset) {
        if (current.color) {
            if (MINECRAFT_COLORS[current.color]) res += "§" + MINECRAFT_COLORS[current.color];
            else if (typeof current.color === 'string' && current.color.startsWith("#")) res += `&${current.color}`;
        } else {
            res += "§r";
        }
        if (current.font) res += `&f{${current.font}};`;
        if (current.shadow_color !== undefined) res += `&h{${current.shadow_color}};`;
        if (current.bold) res += "§l";
        if (current.italic) res += "§o";
        if (current.underlined) res += "§n";
        if (current.strikethrough) res += "§m";
        if (current.obfuscated) res += "§k";
    } else {
        if (node.font && !inherited.font) res += `&f{${node.font}};`;
        if (node.shadow_color !== undefined && inherited.shadow_color === undefined) res += `&h{${node.shadow_color}};`;
        if (node.bold && !inherited.bold) res += "§l";
        if (node.italic && !inherited.italic) res += "§o";
        if (node.underlined && !inherited.underlined) res += "§n";
        if (node.strikethrough && !inherited.strikethrough) res += "§m";
        if (node.obfuscated && !inherited.obfuscated) res += "§k";
    }

    if (node.sprite) {
        if (node.atlas) {
            res += `&s{${node.atlas}|${node.sprite}};`;
        } else {
            res += `&s{${node.sprite}};`;
        }
    }

    if (node.text) {
        res += typeof node.text === "string" ? node.text : flattenMotd(node.text, current);
    }

    if (node.extra && Array.isArray(node.extra)) {
        res += flattenMotd(node.extra, current);
    }

    // Reset for siblings
    res += "§r";
    if (inherited.color) {
        if (MINECRAFT_COLORS[inherited.color]) res += "§" + MINECRAFT_COLORS[inherited.color];
        else if (typeof inherited.color === 'string' && inherited.color.startsWith("#")) res += `&${inherited.color}`;
    }
    if (inherited.font) res += `&f{${inherited.font}};`;
    if (inherited.shadow_color !== undefined) res += `&h{${inherited.shadow_color}};`;
    if (inherited.bold) res += "§l";
    if (inherited.italic) res += "§o";
    if (inherited.underlined) res += "§n";
    if (inherited.strikethrough) res += "§m";
    if (inherited.obfuscated) res += "§k";

    return res;
}

export function getCharWidth(c: string, bold: boolean): number {
    if (c === '\n') return 0;
    
    let w = 5;
    if ("ı!',.:;i|¡·".includes(c)) w = 1;
    else if ("`lìí".includes(c)) w = 2;
    else if ("Íİ \"()*I[]t{}ïî".includes(c)) w = 3;
    else if ("<>fkªº▌⌡°ⁿ²".includes(c)) w = 4;
    else if ("@~«»σ≡≈√".includes(c)) w = 6;
    else if ("®½¼░╢╖╣║╗╝╜∞∅⌠".includes(c)) w = 7;
    else if ("▒▓└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┌█▄▐▀".includes(c)) w = 8;
    else if ("ŒœæÆ".includes(c)) w = 9;

    return w + 1 + (bold ? 1 : 0);
}

export function wrapMinecraftText(text: string, maxWidth: number): string {
    text = text.replace(/\\u00a7/g, "§");

    const lines: string[] = [];
    let currentWidth = 0;
    let isBold = false;
    let lastSpaceGlobalIndex = -1;
    let lineStartIndex = 0;
    
    let formatToPrepend = "";

    const getFormatFromString = (s: string) => {
        let color = "";
        let formats = "";
        let font = "";
        for (let i = 0; i < s.length; i++) {
            if (s[i] === '§' && i + 1 < s.length) {
                const code = s[i+1].toLowerCase();
                if (code === 'x' && i + 13 < s.length) {
                    let isHex = true;
                    for (let j = 1; j <= 6; j++) {
                        if (s[i + j*2] !== '§') { isHex = false; break; }
                    }
                    if (isHex) {
                        color = s.substring(i, i+14);
                        formats = "";
                        i += 13;
                        continue;
                    }
                }
                if (/[0-9a-fr]/i.test(code)) {
                    color = "§" + code;
                    formats = "";
                } else if (/[lmnok]/i.test(code)) {
                    formats += "§" + code;
                }
                i++;
            } else if (s[i] === '&' && s[i+1] === '#' && i + 7 < s.length) {
                if (/^[0-9a-f]{6}$/i.test(s.substring(i+2, i+8))) {
                    color = s.substring(i, i+8);
                    formats = "";
                    i += 7;
                }
            } else if (s[i] === '&' && s[i+1] === 'f' && s[i+2] === '{') {
                const end = s.indexOf('};', i+3);
                if (end !== -1) {
                    font = s.substring(i, end+2);
                    i = end + 1;
                }
            } else if (s[i] === '&' && s[i+1] === 's' && s[i+2] === '{') {
                const end = s.indexOf('};', i+3);
                if (end !== -1) {
                    i = end + 1;
                }
            } else if (s[i] === '&' && s[i+1] === 'h' && s[i+2] === '{') {
                const end = s.indexOf('};', i+3);
                if (end !== -1) {
                    formats += s.substring(i, end+2);
                    i = end + 1;
                }
            }
        }
        return color + font + formats;
    };

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '§' && i + 1 < text.length) {
            const code = text[i+1].toLowerCase();
            if (code === 'x' && i + 13 < text.length) {
                let isHex = true;
                for (let j = 1; j <= 6; j++) {
                    if (text[i + j*2] !== '§') { isHex = false; break; }
                }
                if (isHex) {
                    isBold = false;
                    i += 13;
                    continue;
                }
            }
            if (code === 'l') isBold = true;
            else if (code === 'r' || /[0-9a-f]/.test(code)) isBold = false;
            i++;
            continue;
        }
        if (text[i] === '&' && text[i+1] === '#' && i + 7 < text.length) {
            if (/^[0-9a-f]{6}$/i.test(text.substring(i+2, i+8))) {
                isBold = false;
                i += 7;
                continue;
            }
        }
        if (text[i] === '&' && text[i+1] === 'f' && text[i+2] === '{') {
            const end = text.indexOf('};', i+3);
            if (end !== -1) {
                i = end + 1;
                continue;
            }
        }
        
        if (text[i] === '&' && text[i+1] === 'h' && text[i+2] === '{') {
            const end = text.indexOf('};', i+3);
            if (end !== -1) {
                i = end + 1;
                continue;
            }
        }
        
        if (text[i] === '&' && text[i+1] === 's' && text[i+2] === '{') {
            const end = text.indexOf('};', i+3);
            if (end !== -1) {
                if (currentWidth + 9 > maxWidth) {
                    if (lastSpaceGlobalIndex !== -1) {
                        lines.push(formatToPrepend + text.substring(lineStartIndex, lastSpaceGlobalIndex));
                        i = lastSpaceGlobalIndex; 
                        lineStartIndex = i + 1;
                        formatToPrepend = getFormatFromString(text.substring(0, lineStartIndex));
                        lastSpaceGlobalIndex = -1;
                        currentWidth = 0;
                        isBold = formatToPrepend.includes("§l");
                    } else {
                        lines.push(formatToPrepend + text.substring(lineStartIndex, i));
                        lineStartIndex = i;
                        formatToPrepend = getFormatFromString(text.substring(0, lineStartIndex));
                        currentWidth = 0;
                        isBold = formatToPrepend.includes("§l");
                        i--; // Re-process this on the new line
                    }
                } else {
                    currentWidth += 9;
                    i = end + 1;
                }
                continue;
            }
        }
        
        const c = text[i];
        if (c === '\n') {
            lines.push(formatToPrepend + text.substring(lineStartIndex, i));
            lineStartIndex = i + 1;
            formatToPrepend = getFormatFromString(text.substring(0, lineStartIndex));
            currentWidth = 0;
            lastSpaceGlobalIndex = -1;
            continue;
        }
        
        const w = getCharWidth(c, isBold);
        
        if (currentWidth + w > maxWidth) {
            if (lastSpaceGlobalIndex !== -1) {
                lines.push(formatToPrepend + text.substring(lineStartIndex, lastSpaceGlobalIndex));
                i = lastSpaceGlobalIndex; 
                lineStartIndex = i + 1;
                formatToPrepend = getFormatFromString(text.substring(0, lineStartIndex));
                lastSpaceGlobalIndex = -1;
                currentWidth = 0;
                isBold = formatToPrepend.includes("§l");
            } else {
                lines.push(formatToPrepend + text.substring(lineStartIndex, i));
                lineStartIndex = i;
                formatToPrepend = getFormatFromString(text.substring(0, lineStartIndex));
                currentWidth = 0;
                isBold = formatToPrepend.includes("§l");
                i--; // Reprocess this character on the new line
            }
        } else {
            if (c === ' ') lastSpaceGlobalIndex = i;
            currentWidth += w;
        }
    }
    lines.push(formatToPrepend + text.substring(lineStartIndex));
    return lines.join('\n');
}

export function generateHiddenString(targetWidth: number): string {
    let res = "";
    let current = 0;
    while (current < targetWidth) {
        if (targetWidth - current >= 6) {
            res += "-";
            current += 6;
        } else if (targetWidth - current === 5) {
            res += "f";
            current += 5;
        } else if (targetWidth - current === 4) {
            res += " ";
            current += 4;
        } else if (targetWidth - current === 3) {
            res += "l";
            current += 3;
        } else if (targetWidth - current === 2) {
            res += "i";
            current += 2;
        } else {
            res += "i";
            current += 2;
        }
    }
    return res;
}

export function getShadowColor(colorHex: string | undefined): string {
    if (!colorHex) return "rgba(0,0,0,1)";
    const r = Math.floor(parseInt(colorHex.substring(1, 3), 16) * 0.25);
    const g = Math.floor(parseInt(colorHex.substring(3, 5), 16) * 0.25);
    const b = Math.floor(parseInt(colorHex.substring(5, 7), 16) * 0.25);
    return `rgba(${r}, ${g}, ${b}, 1)`;
}

export function parseArgb(argb: number): string {
    const a = ((argb >> 24) & 0xFF) / 255;
    const r = (argb >> 16) & 0xFF;
    const g = (argb >> 8) & 0xFF;
    const b = argb & 0xFF;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}


export const OBFUSCATION_MAP_NORMAL: Record<number, string[]> = {};
export const OBFUSCATION_MAP_BOLD: Record<number, string[]> = {};

for (let i = 0; i < OBFUSCATION_CHARS.length; i++) {
    const c = OBFUSCATION_CHARS[i];
    const wNormal = getCharWidth(c, false);
    if (!OBFUSCATION_MAP_NORMAL[wNormal]) OBFUSCATION_MAP_NORMAL[wNormal] = [];
    OBFUSCATION_MAP_NORMAL[wNormal].push(c);
    
    const wBold = getCharWidth(c, true);
    if (!OBFUSCATION_MAP_BOLD[wBold]) OBFUSCATION_MAP_BOLD[wBold] = [];
    OBFUSCATION_MAP_BOLD[wBold].push(c);
}
