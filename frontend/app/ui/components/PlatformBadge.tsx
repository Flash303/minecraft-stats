import { cn } from "@/core/lib/utils"
import { JavaLogo } from "@/ui/components/JavaLogo"
import { BedrockLogo } from "@/ui/components/BedrockLogo"

interface PlatformBadgeProps {
    type: "java" | "bedrock"
    size?: "sm" | "md"
    className?: string
}

export function PlatformBadge({ type, size = "sm", className }: PlatformBadgeProps) {
    const isJava = type === "java"

    return (
        <span
            className={cn(
                "inline-flex items-center font-semibold shadow-xs whitespace-nowrap border transition-colors",
                size === "sm"
                    ? "rounded-lg px-2 py-0.5 text-[10px] gap-1"
                    : "rounded-lg px-2.5 py-1 text-xs gap-1.5",
                isJava
                    ? "border-warning/20 bg-warning/10 text-warning"
                    : "border-info/20 bg-info/10 text-info",
                className
            )}
        >
            {isJava ? (
                <>
                    <JavaLogo className={size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    <span>Java</span>
                </>
            ) : (
                <>
                    <BedrockLogo className={size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5"} />
                    <span>Bedrock</span>
                </>
            )}
        </span>
    )
}

export function JavaBadge({ size = "sm", className }: Omit<PlatformBadgeProps, "type">) {
    return <PlatformBadge type="java" size={size} className={className} />
}

export function BedrockBadge({ size = "sm", className }: Omit<PlatformBadgeProps, "type">) {
    return <PlatformBadge type="bedrock" size={size} className={className} />
}
