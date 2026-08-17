import React from "react";

export function SpriteImage({ src, alt, shadow, colorHex }: { src: string, alt: string, shadow?: string | null, colorHex?: string }) {
    const imgRef = React.useRef<HTMLImageElement>(null);
    const filterId = "tint-" + React.useId().replace(/:/g, "");

    React.useEffect(() => {
        const img = imgRef.current;
        if (!img) return;

        const checkAnimate = () => {
            const nw = img.naturalWidth;
            const nh = img.naturalHeight;
            if (nh > nw && nw > 0 && nh % nw === 0) {
                const frames = nh / nw;
                if (frames > 1 && img.getAnimations().length === 0) {
                    img.animate([
                        { objectPosition: '0 0%' },
                        { objectPosition: `0 ${(frames / (frames - 1)) * 100}%` }
                    ], {
                        duration: frames * 100,
                        easing: `steps(${frames}, end)`,
                        iterations: Infinity
                    });
                }
            }
        };

        if (img.complete) {
            checkAnimate();
        } else {
            img.onload = checkAnimate;
        }
    }, [src]);

    const r = colorHex ? parseInt(colorHex.substring(1, 3), 16) / 255 : 1;
    const g = colorHex ? parseInt(colorHex.substring(3, 5), 16) / 255 : 1;
    const b = colorHex ? parseInt(colorHex.substring(5, 7), 16) / 255 : 1;
    const needsTint = colorHex && colorHex.toLowerCase() !== '#ffffff';

    return (
        <span style={{ 
            display: 'inline-block',
            position: 'relative',
            verticalAlign: 'text-top',
            lineHeight: 0,
            filter: shadow ? `drop-shadow(2px 2px 0px ${shadow})` : 'none' 
        }}>
            {needsTint && (
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                    <filter id={filterId}>
                        <feColorMatrix 
                            type="matrix" 
                            values={`
                                ${r} 0 0 0 0
                                0 ${g} 0 0 0
                                0 0 ${b} 0 0
                                0 0 0 1 0
                            `} 
                        />
                    </filter>
                </svg>
            )}
            <img 
                ref={imgRef}
                src={src}
                alt={alt}
                style={{ 
                    display: 'block', 
                    height: '0.8888em',
                    width: '0.8888em',
                    imageRendering: 'pixelated',
                    objectFit: 'cover',
                    objectPosition: 'top',
                    filter: needsTint ? `url(#${filterId})` : 'none'
                }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
        </span>
    );
}