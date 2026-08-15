import React from "react";
import { cn } from "@/lib/utils";
import pingIcon from "@/assets/ping.webp";
import default_icon from "@/assets/default_favicon.svg";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CursorTooltip } from "./components/CursorTooltip";
import { generateHiddenString } from "./utils";
import { parseLegacyText } from "./parser";
import type { MinecraftMotdProps } from "./types";
import { flattenMotd, wrapMinecraftText } from "./utils";

export function MinecraftMotd({ 
    motd, 
    className,
    serverName = "Minecraft Server",
    currentPlayers = 0,
    maxPlayers = 20,
    favicon,
    pingTime,
    lastSample
}: MinecraftMotdProps) {
    const actualMotd = motd || { text: "A Minecraft Server", color: "dark_gray" };
    
    const displayFavicon = favicon || default_icon;

    const guiScale = 2;
    const listWidth = 304; // Standard Minecraft list width
    const textMaxWidth = listWidth - 32 - 2; // Width in MC pixels
    
    const fontHeight = 9 * guiScale;
    const iconSize = 32 * guiScale;
    const margin = 2 * guiScale;
    const maxLines = 2;

    // Fully parse MOTD to replicate exact Minecraft text wrapping
    const flatMotd = flattenMotd(actualMotd);
    const wrappedMotd = wrapMinecraftText(flatMotd, textMaxWidth);
    // Limit to exactly 2 lines
    const finalLines = wrappedMotd.split('\n').slice(0, 2).join('\n');
    const renderedNodes = parseLegacyText(finalLines);

    return (
        <div className={cn(
            "flex bg-[#000000] p-[4px] mx-auto w-fit",
            className
        )} style={{ maxWidth: '100%' }}>
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
                style={{ maxWidth: '100%' }}
            >
                {/* Hidden string to force exact rendered width of MC text */}
                <div 
                    className="h-0 overflow-hidden pointer-events-none select-none font-minecraft opacity-0" 
                    aria-hidden="true"
                    style={{ fontSize: `${fontHeight}px`, whiteSpace: 'pre' }}
                >
                    {generateHiddenString(textMaxWidth)}
                </div>
                <div 
                    className="flex w-full items-center font-minecraft"
                    style={{ fontSize: `${fontHeight}px`, height: `${fontHeight}px`, marginBottom: '4px' }}
                >
                    <span className="text-white truncate">{serverName}</span>
                    <span className="text-[#aaaaaa] ml-auto flex items-center shrink-0">
                        {lastSample ? (
                            <CursorTooltip 
                                fontHeight={fontHeight}
                                content={
                                    <div className="flex flex-col text-left whitespace-pre-wrap">
                                        {lastSample.trimEnd().split('\n').map((line, i) => (
                                            <div key={i} className="min-h-[18px]">
                                                {parseLegacyText(line)}
                                            </div>
                                        ))}
                                    </div>
                                }
                            >
                                {currentPlayers}
                                <span className="mx-[2px] text-[#555555]">/</span>
                                {maxPlayers}
                            </CursorTooltip>
                        ) : (
                            <>
                                {currentPlayers}
                                <span className="mx-[2px] text-[#555555]">/</span>
                                {maxPlayers}
                            </>
                        )}
                        <div className="flex items-center ml-[4px]">
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <div>
                                        <img
                                            className="flex-shrink-0"
                                            style={{ height: `${fontHeight}px`, imageRendering: "pixelated" }}
                                            src={pingIcon}
                                            alt="ping"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                        />
                                    </div>
                                </TooltipTrigger>
                                {pingTime != null && (
                                    <TooltipContent 
                                        side="top" 
                                        className="bg-[#111111] border-[#333333] text-white px-2 py-1 text-xs"
                                    >
                                        <p>{pingTime} ms</p>
                                    </TooltipContent>
                                )}
                            </Tooltip>
                        </div>
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