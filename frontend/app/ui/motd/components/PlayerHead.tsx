import React from "react";

export function PlayerHead({ base64, hat, shadow }: { base64: string, hat: boolean, shadow?: string | null }) {
    let url = "";
    try {
        const decoded = atob(base64);
        const parsed = JSON.parse(decoded);
        url = parsed.textures.SKIN.url;
    } catch (e) {
        return null;
    }

    if (!url) return null;

    return (
        <span style={{ 
            display: 'inline-block',
            position: 'relative',
            verticalAlign: 'text-top',
            lineHeight: 0,
            height: '1em',
            width: '0.8888em',
        }}>
            {/* Base head (x: 8, y: 8, w: 8, h: 8) */}
            <span style={{
                display: 'block',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundImage: `url(${url})`,
                backgroundSize: '800% 800%',
                backgroundPosition: '14.2857% 14.2857%',
                imageRendering: 'pixelated'
            }} />
            {/* Hat layer (x: 40, y: 8, w: 8, h: 8) */}
            {hat && (
                <span style={{
                    display: 'block',
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundImage: `url(${url})`,
                    backgroundSize: '800% 800%',
                    backgroundPosition: '71.4285% 14.2857%',
                    imageRendering: 'pixelated'
                }} />
            )}
        </span>
    );
}
