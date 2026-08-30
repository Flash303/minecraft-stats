import * as React from "react"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

import { cn } from "@/core/lib/utils"

function ToggleGroup({
    className,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
    return (
        <ToggleGroupPrimitive.Root
            data-slot="toggle-group"
            className={cn("flex w-full items-center gap-1 rounded-xl bg-muted p-1", className)}
            {...props}
        />
    )
}

function ToggleGroupItem({
    className,
    ...props
}: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
    return (
        <ToggleGroupPrimitive.Item
            data-slot="toggle-group-item"
            className={cn(
                "flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-2 text-center text-xs font-medium transition-all outline-none sm:text-sm",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "text-muted-foreground hover:text-foreground hover:bg-accent",
                "data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:font-semibold data-[state=on]:shadow-sm",
                "disabled:pointer-events-none disabled:opacity-50",
                "[&_svg]:pointer-events-none [&_svg]:shrink-0",
                className
            )}
            {...props}
        />
    )
}

export { ToggleGroup, ToggleGroupItem }
