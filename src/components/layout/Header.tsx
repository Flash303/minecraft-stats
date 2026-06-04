import { Server as ServerIcon } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

interface HeaderProps {
    onRefresh?: () => void
    isLoading?: boolean
    leftContent?: React.ReactNode
    rightContent?: React.ReactNode
}

export function Header({ onRefresh, isLoading, leftContent, rightContent }: HeaderProps) {
    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container flex h-14 items-center gap-4 px-4">
                <div className="flex items-center gap-4">
                    {leftContent || (
                        <Link to="/" className="flex items-center gap-2">
                            <ServerIcon className="h-5 w-5 text-primary" />
                            <span className="font-bold tracking-tight hidden sm:inline-block">Minecraft Stats</span>
                        </Link>
                    )}
                </div>
                
                <div className="ml-auto flex items-center gap-2">
                    {rightContent}
                    {onRefresh && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onRefresh}
                            disabled={isLoading}
                        >
                            {isLoading ? "Chargement..." : "Actualiser"}
                        </Button>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    )
}
