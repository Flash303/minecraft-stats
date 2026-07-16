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
    black: "#000000",
    dark_blue: "#0000AA",
    dark_green: "#00AA00",
    dark_aqua: "#00AAAA",
    dark_red: "#AA0000",
    dark_purple: "#AA00AA",
    gold: "#FFAA00",
    gray: "#AAAAAA",
    dark_gray: "#555555",
    blue: "#5555FF",
    green: "#55FF55",
    aqua: "#55FFFF",
    red: "#FF5555",
    light_purple: "#FF55FF",
    yellow: "#FFFF55",
    white: "#FFFFFF",
}

// Convert legacy color codes like §a to span styles (basic support)
function parseLegacyText(text: string): React.ReactNode[] {
    if (!text) return []
    // If no formatting codes, return plain text
    if (!text.includes("§") && !text.includes("\\u00a7")) {
        return [text]
    }
    
    // Replace unicode format char if present
    const normalizedText = text.replace(/\\u00a7/g, "§")
    
    const parts = normalizedText.split(/(§[0-9a-fk-or])/i)
    const elements: React.ReactNode[] = []
    
    let currentColor: string | undefined = undefined
    let currentBold = false
    let currentItalic = false
    let currentUnderlined = false
    let currentStrikethrough = false
    let currentObfuscated = false

    const applyFormatting = (code: string) => {
        code = code.toLowerCase().charAt(1)
        switch (code) {
            case "0": currentColor = MINECRAFT_COLORS.black; break;
            case "1": currentColor = MINECRAFT_COLORS.dark_blue; break;
            case "2": currentColor = MINECRAFT_COLORS.dark_green; break;
            case "3": currentColor = MINECRAFT_COLORS.dark_aqua; break;
            case "4": currentColor = MINECRAFT_COLORS.dark_red; break;
            case "5": currentColor = MINECRAFT_COLORS.dark_purple; break;
            case "6": currentColor = MINECRAFT_COLORS.gold; break;
            case "7": currentColor = MINECRAFT_COLORS.gray; break;
            case "8": currentColor = MINECRAFT_COLORS.dark_gray; break;
            case "9": currentColor = MINECRAFT_COLORS.blue; break;
            case "a": currentColor = MINECRAFT_COLORS.green; break;
            case "b": currentColor = MINECRAFT_COLORS.aqua; break;
            case "c": currentColor = MINECRAFT_COLORS.red; break;
            case "d": currentColor = MINECRAFT_COLORS.light_purple; break;
            case "e": currentColor = MINECRAFT_COLORS.yellow; break;
            case "f": currentColor = MINECRAFT_COLORS.white; break;
            case "l": currentBold = true; break;
            case "m": currentStrikethrough = true; break;
            case "n": currentUnderlined = true; break;
            case "o": currentItalic = true; break;
            case "k": currentObfuscated = true; break;
            case "r":
                currentColor = MINECRAFT_COLORS.gray // MOTD default color is often gray or white, let's use gray
                currentBold = false
                currentItalic = false
                currentUnderlined = false
                currentStrikethrough = false
                currentObfuscated = false
                break;
        }
    }

    parts.forEach((part, i) => {
        if (!part) return
        if (part.startsWith("§")) {
            applyFormatting(part)
        } else {
            // Text node with current styling
            const style: React.CSSProperties = {}
            if (currentColor) style.color = currentColor
            
            elements.push(
                <span 
                    key={i} 
                    style={style}
                    className={cn(
                        currentBold && "font-bold",
                        currentItalic && "italic",
                        currentUnderlined && "underline",
                        currentStrikethrough && "line-through",
                        // Obfuscated could be animated or just blurred, let's keep it simple for now
                        currentObfuscated && "blur-[2px]"
                    )}
                >
                    {part}
                </span>
            )
        }
    })
    
    return elements
}

const MotdNode = ({ 
    node, 
    inheritedColor, 
    inheritedBold,
    inheritedItalic,
    inheritedUnderlined,
    inheritedStrikethrough,
    inheritedObfuscated
}: { 
    node: MotdComponent | any,
    inheritedColor?: string,
    inheritedBold?: boolean,
    inheritedItalic?: boolean,
    inheritedUnderlined?: boolean,
    inheritedStrikethrough?: boolean,
    inheritedObfuscated?: boolean
}) => {
    // If node is a primitive string
    if (typeof node === "string") {
        const textNodes = parseLegacyText(node)
        return (
            <span
                style={{ color: inheritedColor }}
                className={cn(
                    inheritedBold && "font-bold",
                    inheritedItalic && "italic",
                    inheritedUnderlined && "underline",
                    inheritedStrikethrough && "line-through",
                    inheritedObfuscated && "blur-[2px]"
                )}
            >
                {textNodes.length > 0 ? textNodes : node}
            </span>
        )
    }
    
    if (!node || typeof node !== "object") return null;

    // Some SLP responses nest the motd inside a `description` field
    if (node.description) {
        return (
            <MotdNode
                node={node.description}
                inheritedColor={inheritedColor}
                inheritedBold={inheritedBold}
                inheritedItalic={inheritedItalic}
                inheritedUnderlined={inheritedUnderlined}
                inheritedStrikethrough={inheritedStrikethrough}
                inheritedObfuscated={inheritedObfuscated}
            />
        )
    }

    const {
        text,
        color,
        bold,
        italic,
        underlined,
        strikethrough,
        obfuscated,
        extra,
    } = node

    let actualColor = inheritedColor
    if (color) {
        if (MINECRAFT_COLORS[color]) {
            actualColor = MINECRAFT_COLORS[color]
        } else if (typeof color === 'string' && color.startsWith("#")) {
            actualColor = color
        }
    }

    const isBold = bold ?? inheritedBold
    const isItalic = italic ?? inheritedItalic
    const isUnderlined = underlined ?? inheritedUnderlined
    const isStrikethrough = strikethrough ?? inheritedStrikethrough
    const isObfuscated = obfuscated ?? inheritedObfuscated

    // If there is no text and no extra, maybe it's just a raw object we don't understand
    // We can fallback to stringifying it if it's completely empty, but returning null is cleaner.
    if (text === undefined && !extra) {
        // Fallback for weird formats, if there's no known property, stringify
        if (Object.keys(node).length > 0) {
            return <span>{parseLegacyText(JSON.stringify(node))}</span>
        }
        return null;
    }

    return (
        <span
            style={{ color: actualColor }}
            className={cn(
                isBold && "font-bold",
                isItalic && "italic",
                isUnderlined && "underline",
                isStrikethrough && "line-through",
                isObfuscated && "blur-[2px]"
            )}
        >
            {text ? (typeof text === 'string' ? parseLegacyText(text) : <MotdNode node={text} />) : null}
            {extra && Array.isArray(extra) && extra.map((child, i) => (
                <MotdNode 
                    key={i} 
                    node={child} 
                    inheritedColor={actualColor}
                    inheritedBold={isBold}
                    inheritedItalic={isItalic}
                    inheritedUnderlined={isUnderlined}
                    inheritedStrikethrough={isStrikethrough}
                    inheritedObfuscated={isObfuscated}
                />
            ))}
        </span>
    )
}



export function MinecraftMotd({ 
    motd, 
    className,
    serverName = "Minecraft Server",
    currentPlayers = 0,
    maxPlayers = 20,
    favicon
}: MinecraftMotdProps) {
    if (!motd) return null
    
    // Ensure array for consistent mapping
    const nodes = Array.isArray(motd) ? motd : [motd]
    
    // Use the provided favicon or fallback to a default image/svg
    const displayFavicon = favicon || "/assets/default_favicon.png"

    return (
        <div className={cn(
            "flex w-full max-w-[610px] min-h-[64px] bg-[#000000] p-[10px] mx-auto",
            className
        )}>
            <div className="flex items-center mr-[10px] shrink-0">
                <img 
                    className="w-12 h-12 sm:w-16 sm:h-16" 
                    src={displayFavicon} 
                    alt="Server icon"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAzSURBVGhD7cExAQAAAMKg9U9tCy8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAuBk4KAAAEyqOaAAAAABJRU5ErkJggg==' }}
                />
            </div>
            <div className="flex flex-col flex-grow justify-center leading-[18px] overflow-hidden">
                <div className="flex w-full items-center mb-0 font-minecraft text-sm sm:text-[15px]">
                    <span className="text-white mb-[2px] truncate">{serverName}</span>
                    <span className="text-[#aaaaaa] ml-auto flex items-center shrink-0 text-xs sm:text-[15px]">
                        {currentPlayers}
                        <span className="mx-0.5 text-[#555555]">/</span>
                        {maxPlayers}
                        <img
                            className="h-[16px] sm:h-[20px] flex-shrink-0 ml-[4px] -translate-y-[1px] sm:-translate-y-[2px]"
                            src={pingIcon}
                            alt="ping"
                            style={{imageRendering: "pixelated"}}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                    </span>
                </div>
                <pre
                    className="mb-0 text-[#AAAAAA] overflow-hidden text-xs sm:text-[15px] font-minecraft whitespace-pre-wrap break-words line-clamp-2"
                >
                    <div className="w-full text-left">
                        {nodes.map((node, i) => (
                            <MotdNode key={i} node={node} />
                        ))}
                    </div>
                </pre>
            </div>
        </div>
    )
}
