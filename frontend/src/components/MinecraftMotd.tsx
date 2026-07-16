import React from "react"
import { cn } from "@/lib/utils"
import pingIcon from "@/assets/ping.png"

export type MotdComponent =
    | string
    | {
          text?: string
          color?: string
          bold?: boolean
          italic?: boolean
          underlined?: boolean
          strikethrough?: boolean
          obfuscated?: boolean
          extra?: MotdComponent[]
      }

interface MinecraftMotdProps {
    motd: MotdComponent | MotdComponent[] | any
    className?: string
    serverName?: string
    currentPlayers?: number
    maxPlayers?: number
    favicon?: string | null
}

const MINECRAFT_COLORS: Record<string, string> = {
    black: "0", dark_blue: "1", dark_green: "2", dark_aqua: "3", dark_red: "4", dark_purple: "5", gold: "6", gray: "7", dark_gray: "8", blue: "9", green: "a", aqua: "b", red: "c", light_purple: "d", yellow: "e", white: "f"
}

const CODE_TO_COLOR: Record<string, string> = {
    "0": "#000000", "1": "#0000AA", "2": "#00AA00", "3": "#00AAAA", "4": "#AA0000", "5": "#AA00AA", "6": "#FFAA00", "7": "#AAAAAA", "8": "#555555", "9": "#5555FF", "a": "#55FF55", "b": "#55FFFF", "c": "#FF5555", "d": "#FF55FF", "e": "#FFFF55", "f": "#FFFFFF"
}

// 1. Flatten MOTD JSON into a string with legacy codes (§) and hex codes (&#RRGGBB;)
function flattenMotd(node: any, inherited: any = {}): string {
    if (typeof node === "string") return node;
    if (Array.isArray(node)) return node.map(n => flattenMotd(n, inherited)).join("");
    if (!node || typeof node !== "object") return "";
    if (node.description) return flattenMotd(node.description, inherited);

    const current = { ...inherited };
    let res = "";

    let needsReset = false;
    if (node.color && node.color !== inherited.color) needsReset = true;
    if (node.bold === false && inherited.bold) needsReset = true;
    if (node.italic === false && inherited.italic) needsReset = true;
    if (node.underlined === false && inherited.underlined) needsReset = true;
    if (node.strikethrough === false && inherited.strikethrough) needsReset = true;
    if (node.obfuscated === false && inherited.obfuscated) needsReset = true;

    if (node.color) current.color = node.color;
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
        if (current.bold) res += "§l";
        if (current.italic) res += "§o";
        if (current.underlined) res += "§n";
        if (current.strikethrough) res += "§m";
        if (current.obfuscated) res += "§k";
    } else {
        if (node.bold && !inherited.bold) res += "§l";
        if (node.italic && !inherited.italic) res += "§o";
        if (node.underlined && !inherited.underlined) res += "§n";
        if (node.strikethrough && !inherited.strikethrough) res += "§m";
        if (node.obfuscated && !inherited.obfuscated) res += "§k";
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
    if (inherited.bold) res += "§l";
    if (inherited.italic) res += "§o";
    if (inherited.underlined) res += "§n";
    if (inherited.strikethrough) res += "§m";
    if (inherited.obfuscated) res += "§k";

    return res;
}

function getCharWidth(c: string, bold: boolean): number {
    if (c === '\n') return 0;
    if (c === ' ') return 4 + (bold ? 1 : 0);
    
    let w = 5;
    switch (c) {
        case 'i': case '!': case '.': case ',': case ':': case ';': case '\'': case '|': w = 1; break;
        case 'l': w = 2; break;
        case 'I': case 't': case '[': case ']': case '"': case '`': w = 3; break;
        case 'f': case 'k': case '(': case ')': case '<': case '>': case '{': case '}': w = 4; break;
        case '@': case '~': w = 6; break;
    }
    return w + 1 + (bold ? 1 : 0);
}

// 2. Compute true Minecraft widths and insert \n where it wraps
function wrapMinecraftText(text: string, maxWidth: number): string {
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
            }
        }
        return color + formats;
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

// 3. Convert formatted string with \n into React nodes
function parseLegacyText(text: string): React.ReactNode[] {
    const parts = text.split(/(§x(?:§[0-9a-fA-F]){6}|§[0-9a-fk-or]|&#[0-9a-fA-F]{6})/i);
    const elements: React.ReactNode[] = [];
    
    let currentColor: string | undefined = undefined;
    let currentBold = false;
    let currentItalic = false;
    let currentUnderlined = false;
    let currentStrikethrough = false;
    let currentObfuscated = false;

    parts.forEach((part, i) => {
        if (!part) return;
        if (part.startsWith("§") || part.startsWith("&#")) {
            const code = part.toLowerCase();
            if (code.startsWith('&#')) {
                currentColor = part.substring(1, 8); // e.g. #FF0000
                currentBold = false;
                currentItalic = false;
                currentUnderlined = false;
                currentStrikethrough = false;
                currentObfuscated = false;
            } else if (code.startsWith('§x')) {
                let hex = '#';
                for (let j = 2; j < code.length; j += 2) {
                    hex += code[j+1];
                }
                currentColor = hex;
                currentBold = false;
                currentItalic = false;
                currentUnderlined = false;
                currentStrikethrough = false;
                currentObfuscated = false;
            } else {
                const char = code.charAt(1);
                if (CODE_TO_COLOR[char]) {
                    currentColor = CODE_TO_COLOR[char];
                    currentBold = false;
                    currentItalic = false;
                    currentUnderlined = false;
                    currentStrikethrough = false;
                    currentObfuscated = false;
                }
                else switch (char) {
                    case "l": currentBold = true; break;
                    case "m": currentStrikethrough = true; break;
                    case "n": currentUnderlined = true; break;
                    case "o": currentItalic = true; break;
                    case "k": currentObfuscated = true; break;
                    case "r":
                        currentColor = CODE_TO_COLOR["7"]; // gray
                        currentBold = false;
                        currentItalic = false;
                        currentUnderlined = false;
                        currentStrikethrough = false;
                        currentObfuscated = false;
                        break;
                }
            }
        } else {
            const style: React.CSSProperties = {};
            if (currentColor) style.color = currentColor;
            
            elements.push(
                <span 
                    key={i} 
                    style={style}
                    className={cn(
                        currentBold && "font-bold",
                        currentItalic && "italic",
                        currentUnderlined && "underline",
                        currentStrikethrough && "line-through",
                        currentObfuscated && "blur-[2px]"
                    )}
                >
                    {part}
                </span>
            );
        }
    });
    
    return elements;
}

export function MinecraftMotd({ 
    motd, 
    className,
    serverName = "Minecraft Server",
    currentPlayers = 0,
    maxPlayers = 20,
    favicon
}: MinecraftMotdProps) {
    if (!motd) return null;
    
    const displayFavicon = favicon || "/assets/default_favicon.png";

    const guiScale = 2;
    const listWidth = 304; // Standard Minecraft list width
    const textMaxWidth = listWidth - 32 - 2; // Width in MC pixels (270)
    
    const fontHeight = 9 * guiScale;
    const iconSize = 32 * guiScale;
    const margin = 2 * guiScale;
    const maxLines = 2;

    // Fully parse MOTD to replicate exact Minecraft text wrapping
    const flatMotd = flattenMotd(motd);
    const wrappedMotd = wrapMinecraftText(flatMotd, textMaxWidth);
    // Limit to exactly 2 lines
    const finalLines = wrappedMotd.split('\n').slice(0, 2).join('\n');
    const renderedNodes = parseLegacyText(finalLines);

    return (
        <div className={cn(
            "flex w-full bg-[#000000] p-[4px] mx-auto",
            className
        )} style={{ maxWidth: `${listWidth * guiScale + 8}px` }}>
            <div 
                className="flex items-start shrink-0"
                style={{ marginRight: `${margin}px` }}
            >
                <img 
                    style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                    src={displayFavicon} 
                    alt="Server icon"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAzSURBVGhD7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuBk4KAAAEyqOaAAAAABJRU5ErkJggg==' }}
                />
            </div>
            <div 
                className="flex flex-col flex-grow overflow-hidden"
                style={{ width: `${textMaxWidth * guiScale}px`, maxWidth: '100%' }}
            >
                <div 
                    className="flex w-full items-center font-minecraft"
                    style={{ fontSize: `${fontHeight}px`, height: `${fontHeight}px`, marginBottom: '4px' }}
                >
                    <span className="text-white truncate">{serverName}</span>
                    <span className="text-[#aaaaaa] ml-auto flex items-center shrink-0">
                        {currentPlayers}
                        <span className="mx-[2px] text-[#555555]">/</span>
                        {maxPlayers}
                        <img
                            className="flex-shrink-0 ml-[4px]"
                            style={{ height: `${fontHeight}px`, imageRendering: "pixelated" }}
                            src={pingIcon}
                            alt="ping"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    </span>
                </div>
                <pre
                    className="m-0 text-[#AAAAAA] overflow-hidden font-minecraft break-words"
                    style={{
                        whiteSpace: "pre-wrap",
                        width: "100%",
                        fontSize: `${fontHeight}px`,
                        lineHeight: `${fontHeight}px`,
                        maxHeight: `${fontHeight * maxLines}px`,
                    }}
                >
                    <div className="w-full text-left">
                        {renderedNodes}
                    </div>
                </pre>
            </div>
        </div>
    )
}
