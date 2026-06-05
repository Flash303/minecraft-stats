import { Server as ServerIcon } from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { SignInButton, UserButton, useAuth } from "@clerk/react"
import { AddServerModal } from "./AddServerModal"
import { SearchBar } from "./SearchBar"
import { useSearch } from "@/contexts/SearchContext"

interface HeaderProps {
    onRefresh?: () => void
    isLoading?: boolean
    leftContent?: React.ReactNode
}

export function Header({ onRefresh, isLoading, leftContent }: HeaderProps) {
    const { isSignedIn, isLoaded } = useAuth()
    const { searchQuery, setSearchQuery } = useSearch()

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container flex h-14 items-center gap-4 px-4">
                <div className="flex items-center gap-4">
                    {leftContent || (
                        <div className="flex items-center gap-6">
                            <Link to="/" className="flex items-center gap-2">
                                <ServerIcon className="h-5 w-5 text-primary" />
                                <span className="font-bold tracking-tight hidden sm:inline-block">Minecraft Stats</span>
                            </Link>
                            <Link to="/compare" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                Comparer
                            </Link>
                        </div>
                    )}
                </div>

                <div className="flex-1 flex justify-center max-w-sm mx-auto">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="hidden md:flex"
                            >
                                {isLoading ? "Chargement..." : "Actualiser"}
                            </Button>
                        )}
                        <ThemeToggle />
                    </div>
...

                    <div className="flex items-center gap-2 border-l pl-4 min-w-[100px] justify-center">
                        {!isLoaded ? (
                            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                        ) : isSignedIn ? (
                            <>
                                <AddServerModal onSuccess={onRefresh} />
                                <div className="h-8 w-8 flex items-center justify-center">
                                    <UserButton />
                                </div>
                            </>
                        ) : (
                            <SignInButton mode="modal">
                                <Button size="sm">Connexion</Button>
                            </SignInButton>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
