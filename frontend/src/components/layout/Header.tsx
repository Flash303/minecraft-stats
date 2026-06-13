import { useState } from "react"
import { Languages, Search as SearchIcon, ArrowLeft } from "lucide-react"
import logo from "@/assets/logo.png"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { SignInButton, UserButton, useAuth } from "@clerk/react"
import { AddServerModal } from "./AddServerModal"
import { SearchBar } from "./SearchBar"
import { useSearch } from "@/contexts/SearchContext"
import { useLanguage } from "@/contexts/LanguageContext"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
} from "@/components/ui/select"

interface HeaderProps {
    onRefresh?: () => void
    isLoading?: boolean
    leftContent?: React.ReactNode
}

export function Header({ onRefresh, isLoading, leftContent }: HeaderProps) {
    const { isSignedIn, isLoaded } = useAuth()
    const { searchQuery, setSearchQuery } = useSearch()
    const { language, setLanguage, t } = useLanguage()
    const [isSearchOpen, setIsSearchOpen] = useState(false)

    // Mobile Search Overlay Mode
    if (isSearchOpen) {
        return (
            <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
                <div className="container flex h-14 items-center gap-3 px-4">
                    <button
                        onClick={() => {
                            setIsSearchOpen(false)
                            setSearchQuery("")
                        }}
                        className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1">
                        <SearchBar 
                            value={searchQuery} 
                            onChange={setSearchQuery} 
                            className="max-w-none"
                        />
                    </div>
                </div>
            </header>
        )
    }

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
            <div className="container flex h-14 items-center justify-between gap-4 px-4">
                
                {/* Left: Branding & Navigation */}
                <div className="flex items-center gap-6 min-w-0">
                    {leftContent || (
                        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                                <img src={logo} alt="Logo" className="h-6 w-6 object-contain rounded-md" />
                                <span className="font-bold tracking-tight hidden xs:inline-block text-slate-900 dark:text-zinc-100 text-sm sm:text-base">
                                    {t("header.title")}
                                </span>
                            </Link>
                            <Link 
                                to="/compare" 
                                className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-primary transition-colors whitespace-nowrap"
                            >
                                {t("common.compare")}
                            </Link>
                            {isSignedIn && (
                                <Link 
                                    to="/?tab=mine" 
                                    className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 hover:text-primary transition-colors whitespace-nowrap"
                                >
                                    {t("common.myServers")}
                                </Link>
                            )}
                        </div>
                    )}
                </div>
                
                {/* Middle: Desktop Search Bar (hidden on mobile) */}
                <div className="hidden md:flex flex-1 justify-center max-w-sm mx-auto">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                {/* Right: Actions, Language Select, ThemeToggle, Auth */}
                <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                    {/* Mobile Search Button (visible only on mobile) */}
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        className="h-8 w-8 flex md:hidden items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                    >
                        <SearchIcon className="h-4.5 w-4.5" />
                    </button>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="hidden md:flex"
                            >
                                {isLoading ? t("common.loading") : t("common.refresh")}
                            </Button>
                        )}
                        
                        <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
                            <SelectTrigger className="h-8 w-8 sm:w-[45px] px-0 border-none bg-transparent hover:bg-muted justify-center cursor-pointer">
                                <Languages className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                        
                        <ThemeToggle />
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 border-l pl-2.5 sm:pl-4 min-w-0 justify-center">
                        {!isLoaded ? (
                            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                        ) : isSignedIn ? (
                            <>
                                <AddServerModal onSuccess={onRefresh} />
                                <div className="h-8 w-8 flex items-center justify-center flex-shrink-0">
                                    <UserButton />
                                </div>
                            </>
                        ) : (
                            <SignInButton mode="modal">
                                <Button size="sm" className="h-8 text-[11px] sm:text-xs px-3">{t("header.signIn")}</Button>
                            </SignInButton>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
