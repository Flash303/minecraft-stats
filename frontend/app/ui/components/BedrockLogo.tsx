import { cn } from "@/core/lib/utils"

export const BedrockLogo = ({ className, title }: { className?: string; title?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className={cn("shrink-0", className)}
        xmlns="http://www.w3.org/2000/svg"
    >
        {title && <title>{title}</title>}
        {/* Top Face */}
        <polygon
            points="12,2 21.5,7.5 12,13 2.5,7.5"
            className="opacity-95"
        />
        {/* Left Face */}
        <polygon
            points="2.5,7.5 12,13 12,22 2.5,16.5"
            className="opacity-70"
        />
        {/* Right Face */}
        <polygon
            points="12,13 21.5,7.5 21.5,16.5 12,22"
            className="opacity-45"
        />
        {/* Isometric face separator lines */}
        <line x1="12" y1="2" x2="12" y2="13" stroke="currentColor" strokeWidth="0.6" className="opacity-30" />
        <line x1="2.5" y1="7.5" x2="12" y2="13" stroke="currentColor" strokeWidth="0.6" className="opacity-30" />
        <line x1="21.5" y1="7.5" x2="12" y2="13" stroke="currentColor" strokeWidth="0.6" className="opacity-30" />
        <line x1="12" y1="13" x2="12" y2="22" stroke="currentColor" strokeWidth="0.6" className="opacity-30" />
    </svg>
)
