import { useState } from "react"
import { Languages, Search as SearchIcon, ArrowLeft, Menu, X } from "lucide-react"
import logo from "@/assets/logo.png"
import { ThemeToggle } from "./ThemeToggle"
import { Button } from "@/components/ui/button"
import { Link, useLocation } from "react-router-dom"
import { SignInButton, UserButton, useAuth } from "@clerk/react"
import { AddServerModal } from "./AddServerModal"
import { SearchBar } from "./SearchBar"
import { useSearch } from "@/contexts/SearchContext"
import { useLanguage } from "@/contexts/LanguageContext"
import { useAdmin } from "@/contexts/AdminContext"
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
    const { isAdmin } = useAdmin()
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()
    const activeRoute = location.pathname

    const getLinkClass = (path: string, checkSearch?: string) => {
        const isActive = checkSearch 
            ? activeRoute === path && location.search.includes(checkSearch)
            : activeRoute === path && (!location.search || !location.search.includes("tab="))
        
        return `text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap px-2.5 py-1.5 rounded-md cursor-pointer ${
            isActive 
                ? "text-primary bg-primary/10 dark:bg-primary/20" 
                : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-muted"
        }`
    }

    const getMobileLinkClass = (path: string, checkSearch?: string) => {
        const isActive = checkSearch 
            ? activeRoute === path && location.search.includes(checkSearch)
            : activeRoute === path && (!location.search || !location.search.includes("tab="))
            
        return `text-sm font-semibold transition-all py-2 px-3 rounded-lg flex items-center justify-between cursor-pointer ${
            isActive
                ? "text-primary bg-primary/10 dark:bg-primary/20"
                : "text-slate-650 dark:text-zinc-400 hover:text-primary hover:bg-muted"
        }`
    }

    // Mobile Search Overlay Mode
    if (isSearchOpen) {
        return (
            <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
                <div className="w-full flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8">
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
            <div className="w-full flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-12">
                
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
                            
                            {/* Desktop Nav Links */}
                            <nav className="hidden md:flex items-center gap-2 lg:gap-3">
                                <Link 
                                    to="/compare" 
                                    className={getLinkClass("/compare")}
                                >
                                    {t("common.compare")}
                                </Link>
                                {isSignedIn && (
                                    <Link 
                                        to="/account" 
                                        className={getLinkClass("/account")}
                                    >
                                        {t("common.myServers")}
                                    </Link>
                                )}
                                {isSignedIn && isAdmin && (
                                    <Link 
                                        to="/dashboard" 
                                        className={getLinkClass("/dashboard")}
                                    >
                                        {t("header.admin")}
                                    </Link>
                                )}
                            </nav>
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

                    {/* Desktop Language Switcher */}
                    <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
                        {onRefresh && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onRefresh}
                                disabled={isLoading}
                                className="h-8"
                            >
                                {isLoading ? t("common.loading") : t("common.refresh")}
                            </Button>
                        )}
                        
                        <Select value={language} onValueChange={(v: "fr" | "en") => setLanguage(v)}>
                            <SelectTrigger className="h-8 w-8 sm:w-[45px] px-0 border-none bg-transparent hover:bg-muted justify-center cursor-pointer">
                                <Languages className="h-4 w-4" />
                            </SelectTrigger>
                            <SelectContent align="end">
                                <SelectItem value="fr">Français</SelectItem>
                                <SelectItem value="en">English</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <ThemeToggle />

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

                    {/* Hamburger Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="h-8 w-8 flex md:hidden items-center justify-center rounded-xl hover:bg-muted text-muted-foreground cursor-pointer"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Mobile Dropdown Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t bg-background/95 backdrop-blur-md px-4 py-4 space-y-4 animate-in slide-in-from-top duration-200">
                    <nav className="flex flex-col gap-1.5">
                        <Link
                            to="/"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={getMobileLinkClass("/")}
                        >
                            {t("common.backToHome")}
                        </Link>
                        <Link 
                            to="/compare" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={getMobileLinkClass("/compare")}
                        >
                            {t("common.compare")}
                        </Link>
                        {isSignedIn && (
                            <Link 
                                to="/account" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={getMobileLinkClass("/account")}
                            >
                                {t("common.myServers")}
                            </Link>
                        )}
                        {isSignedIn && isAdmin && (
                            <Link 
                                to="/dashboard" 
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={getMobileLinkClass("/dashboard")}
                            >
                                {t("header.admin")}
                            </Link>
                        )}
                    </nav>

                    <div className="border-t pt-3 flex flex-col gap-3">
                        {onRefresh && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onRefresh()
                                    setIsMobileMenuOpen(false)
                                }}
                                disabled={isLoading}
                                className="w-full justify-center h-9 font-semibold text-xs"
                            >
                                {isLoading ? t("common.loading") : t("common.refresh")}
                            </Button>
                        )}

                        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-muted/40">
                            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400 flex items-center gap-2">
                                <Languages className="h-4 w-4" />
                                {language === "fr" ? "Français" : "English"}
                            </span>
                            <div className="flex gap-1.5">
                                <button
                                    onClick={() => setLanguage("fr")}
                                    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all cursor-pointer ${
                                        language === "fr"
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "hover:bg-muted text-slate-650 dark:text-zinc-400"
                                    }`}
                                >
                                    FR
                                </button>
                                <button
                                    onClick={() => setLanguage("en")}
                                    className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-all cursor-pointer ${
                                        language === "en"
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "hover:bg-muted text-slate-650 dark:text-zinc-400"
                                    }`}
                                >
                                    EN
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </header>
    )
}
