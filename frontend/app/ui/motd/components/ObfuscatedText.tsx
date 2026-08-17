import React from "react";
import { getCharWidth, OBFUSCATION_MAP_BOLD, OBFUSCATION_MAP_NORMAL } from "../utils";

export function ObfuscatedText({ text, isBold }: { text: string, isBold: boolean }) {
    const [scrambled, setScrambled] = React.useState(text);
    
    React.useEffect(() => {
        const map = isBold ? OBFUSCATION_MAP_BOLD : OBFUSCATION_MAP_NORMAL;
        
        const interval = setInterval(() => {
            let newText = "";
            for (let i = 0; i < text.length; i++) {
                const c = text[i];
                if (c === '\n' || c === ' ') {
                    newText += c;
                    continue;
                }
                const w = getCharWidth(c, isBold);
                const options = map[w];
                if (options && options.length > 0) {
                    newText += options[Math.floor(Math.random() * options.length)];
                } else {
                    newText += c;
                }
            }
            setScrambled(newText);
        }, 50);
        
        return () => clearInterval(interval);
    }, [text, isBold]);

    return (
        <>
            {scrambled.split('').map((char, i) => {
                if (char === '\n' || char === ' ') {
                    return <span key={i}>{char}</span>;
                }
                const advance = getCharWidth(char, isBold);
                return (
                    <span 
                        key={i} 
                        style={{ 
                            display: 'inline-block', 
                            width: `${advance * 2}px`, // guiScale = 2
                            textAlign: 'left' 
                        }}
                    >
                        {char}
                    </span>
                );
            })}
        </>
    );
}