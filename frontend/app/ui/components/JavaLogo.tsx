import { FaJava } from "react-icons/fa6"
import { cn } from "@/core/lib/utils"

export const JavaLogo = ({ className, title }: { className?: string; title?: string }) => (
    <span className={cn("inline-flex items-center justify-center shrink-0", className)} title={title}>
        <FaJava className="w-full h-full" />
    </span>
)
