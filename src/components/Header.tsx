import { Server } from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { Button } from "@/components/ui/button"

interface HeaderProps {
    onRefresh?: () => void
    isLoading?: boolean
}

export function Header({ onRefresh, isLoading }: HeaderProps) {
    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container flex h-14 items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    <span className="font-semibold">Minecraft Stats</span>
                </div>
                <div className="flex items-center gap-2">
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            {isLoading ? "Loading..." : "Refresh"}
                        </Button>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}
