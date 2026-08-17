import React from "react";
import { cn } from "@/core/lib/utils";
import { CODE_TO_COLOR } from "./constants";
import { getShadowColor, parseArgb } from "./utils";
import { ObfuscatedText } from "./components/ObfuscatedText";
import { SpriteImage } from "./components/SpriteImage";

export function parseLegacyText(text: string): React.ReactNode[] {
    const parts = text.split(/(§x(?:§[0-9a-fA-F]){6}|§[0-9a-fk-or]|&#[0-9a-fA-F]{6}|&f{[^}]+};|&s{[^}]+};|&h{[^}]*};|\n)/i);
    const elements: React.ReactNode[] = [];
    
    let currentColor: string | undefined = undefined;
    let currentFont: string | undefined = undefined;
    let currentShadowColor: number | undefined = undefined;
    let currentBold = false;
    let currentItalic = false;
    let currentUnderlined = false;
    let currentStrikethrough = false;
    let currentObfuscated = false;

    parts.forEach((part, i) => {
        if (!part) return;
        if (part.startsWith("§") || part.startsWith("&#") || part.startsWith("&f{") || part.startsWith("&s{") || part.startsWith("&h{")) {
            const code = part.toLowerCase();
            if (code.startsWith('&s{')) {
                const inner = part.substring(3, part.length - 2);
                let atlas = 'minecraft:gui';
                let realSpriteId = inner;
                if (inner.includes('|')) {
                    const split = inner.split('|');
                    atlas = split[0];
                    realSpriteId = split[1];
                }
                
                const [namespace, path] = realSpriteId.includes(':') ? realSpriteId.split(':') : ['minecraft', realSpriteId];
                
                let texturePrefix = 'textures/gui/sprites';
                if (atlas === 'minecraft:blocks' || path.startsWith('item/') || path.startsWith('block/')) {
                    texturePrefix = 'textures';
                }

                const spriteUrl = `https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets/26.2/assets/${namespace}/${texturePrefix}/${path}.png`;

                const hasShadow = currentShadowColor !== 0;
                const shadowStr = hasShadow 
                    ? (currentShadowColor !== undefined ? parseArgb(currentShadowColor) : getShadowColor(currentColor))
                    : null;
                    
                const colorToPass = currentColor || CODE_TO_COLOR["7"];

                elements.push(
                    <SpriteImage key={`sprite-${i}`} src={spriteUrl} alt={realSpriteId} shadow={shadowStr} colorHex={colorToPass} />
                );
            } else if (code.startsWith('&f{')) {
                currentFont = part.substring(3, part.length - 2);
            } else if (code.startsWith('&h{')) {
                const val = part.substring(3, part.length - 2);
                if (val === '') {
                    currentShadowColor = undefined;
                } else {
                    currentShadowColor = parseInt(val, 10);
                }
            } else if (code.startsWith('&#')) {
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
                        currentShadowColor = undefined;
                        break;
                }
            }
        } else {
            if (part === '\n') {
                elements.push('\n');
                return;
            }

            const style: React.CSSProperties = {};
            if (currentColor) style.color = currentColor;
            
            const hasShadow = currentShadowColor !== 0;
            if (hasShadow) {
                style.textShadow = `2px 2px 0px ${currentShadowColor !== undefined ? parseArgb(currentShadowColor) : getShadowColor(currentColor)}`;
            }
            
            elements.push(
                <span 
                    key={i} 
                    style={style}
                    className={cn(
                        currentBold && "font-bold",
                        currentItalic && "italic",
                        currentUnderlined && "underline",
                        currentStrikethrough && "line-through",
                        currentFont === "minecraft:illageralt" && "font-illager",
                        currentFont === "minecraft:alt" && "font-enchanting"
                    )}
                >
                    {currentObfuscated ? <ObfuscatedText text={part} isBold={currentBold} /> : part}
                </span>
            );
        }
    });
    
    return elements;
}