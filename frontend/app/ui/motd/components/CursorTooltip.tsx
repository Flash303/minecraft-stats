import React, { useState } from "react"
import { createPortal } from "react-dom"

export function CursorTooltip({
    children,
    content,
    fontHeight = 18,
}: {
    children: React.ReactNode;
    content: React.ReactNode;
    fontHeight?: number;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });

    return (
        <>
            <span
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onMouseMove={(e) => setPos({ x: e.clientX, y: e.clientY })}
                className="cursor-default select-none inline-flex items-center"
            >
                {children}
            </span>
            {isHovered &&
                createPortal(
                    <div
                        style={{
                            position: "fixed",
                            left: pos.x + 16,
                            top: pos.y - 20,
                            zIndex: 9999,
                            fontSize: `${fontHeight}px`,
                            lineHeight: `${fontHeight}px`,
                        }}
                        className="bg-[#000000] border-[2px] border-[#1a1a5a] text-white p-2 font-minecraft max-w-sm shadow-xl pointer-events-none"
                    >
                        {content}
                    </div>,
                    document.body
                )}
        </>
    );
}
