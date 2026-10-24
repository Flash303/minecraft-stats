import { useCallback, useEffect, useMemo, useState } from "react"
import { ArrowLeftRight, House, LayoutDashboard, Menu, Search as SearchIcon, Server, X } from "lucide-react"
import logo from "@/assets/logo.webp"
import { ThemeToggle } from "./ThemeToggle"
import { LanguageSelect } from "./LanguageSelect"
import { Button } from "@/ui/components/button"
import { Link, useLocation } from "react-router"
import { SignInButton, UserButton, useAuth } from "@clerk/react"
import { AddServerModal } from "./AddServerModal"
import { SearchBar } from "./SearchBar"
import { MobileMenu, type MobileNavItem } from "./MobileMenu"
import { useSearch } from "@/core/hooks/useSearch"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useAdmin } from "@/core/contexts/AdminContext"
import { cn } from "@/core/lib/utils"

/** `xl` is the inline-search breakpoint: below it search opens as an overlay. */
const INLINE_SEARCH_QUERY = "(min-width: 1280px)"

function navLinkClass(isActive: boolean) {
    return cn(
        "rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
        isActive
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
    )
}

export function Header() {
    const { isSignedIn, isLoaded } = useAuth()
    const { searchQuery, setSearchQuery, triggerRefresh } = useSearch()
    const { t } = useLanguage()
    const { isAdmin } = useAdmin()
    const [isSearchOpen, setIsSearchOpen] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()
    const activeRoute = location.pathname

    // Close transient surfaces when the user navigates (render-adjust pattern:
    // no effect, so nothing flashes on the first paint after a navigation).
    const [pathForUiState, setPathForUiState] = useState(activeRoute)
    if (pathForUiState !== activeRoute) {
        setPathForUiState(activeRoute)
        setIsSearchOpen(false)
        setIsMobileMenuOpen(false)
    }

    const isActive = (to: string) =>
        to.startsWith("/account") ? activeRoute.startsWith("/account") : activeRoute === to

    const navItems = useMemo<MobileNavItem[]>(() => {
        const items: MobileNavItem[] = [
            { to: "/", label: t("common.home"), icon: House },
            { to: "/compare", label: t("common.compare"), icon: ArrowLeftRight },
        ]
        if (isSignedIn)
            items.push({ to: "/account/servers", label: t("common.mySpace"), icon: Server })
        if (isSignedIn && isAdmin)
            items.push({ to: "/dashboard", label: t("header.admin"), icon: LayoutDashboard })
        return items
    }, [isAdmin, isSignedIn, t])

    const closeSearch = useCallback(() => {
        setIsSearchOpen(false)
        setSearchQuery("")
    }, [setSearchQuery])

    // Keyboard shortcut for the overlay search. When the inline search is
    // visible, SearchBar owns Ctrl/Cmd+K (it focuses its own input).
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"
            if (!isShortcut) return
            if (window.matchMedia(INLINE_SEARCH_QUERY).matches) return
            event.preventDefault()
            setIsSearchOpen(true)
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Escape closes the search overlay.
    useEffect(() => {
        if (!isSearchOpen) return
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") closeSearch()
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [isSearchOpen, closeSearch])

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/85 sticky top-0 z-40 w-full border-b backdrop-blur-md">
            <div className="flex h-16 w-full items-center gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8 xl:px-12">
                {/* Branding */}
                <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={t("header.title")}>
                    <img
                        src={logo}
                        alt=""
                        decoding="async"
                        className="size-7 rounded-md object-contain"
                    />
                    <span className="xs:inline hidden text-sm font-bold tracking-tight whitespace-nowrap text-foreground sm:text-base">
                        {t("header.title")}
                    </span>
                </Link>

                {/* Primary navigation (desktop) */}
                <nav aria-label={t("header.navigation")} className="hidden items-center gap-1 lg:flex">
                    {navItems.map((item) => (
                        <Link key={item.to} to={item.to} className={navLinkClass(isActive(item.to))}>
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Inline search (large screens only, grows into the free space) */}
                <div className="hidden min-w-0 flex-1 justify-center px-2 xl:flex">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        className="max-w-sm"
                    />
                </div>

                {/* Spacer so the right-hand actions stay pinned on smaller screens */}
                <div className="flex-1 xl:hidden" aria-hidden="true" />

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={() => setIsSearchOpen((open) => !open)}
                        aria-label={t("header.openSearch")}
                        aria-expanded={isSearchOpen}
                        className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none xl:hidden"
                    >
                        <SearchIcon aria-hidden="true" className="size-5" />
                    </button>

                    <LanguageSelect className="hidden lg:flex" />

                    <ThemeToggle />

                    <div className="flex items-center gap-1.5 border-l pl-2 sm:gap-2 sm:pl-3">
                        {!isLoaded ? (
                            <div className="size-8 animate-pulse rounded-full bg-muted" />
                        ) : isSignedIn ? (
                            <>
                                <AddServerModal onSuccess={triggerRefresh} />
                                <div className="flex size-8 shrink-0 items-center justify-center">
                                    <UserButton userProfileMode="navigation" userProfileUrl="/account" />
                                </div>
                            </>
                        ) : (
                            <SignInButton mode="modal">
                                <Button size="sm" className="h-9 px-3">
                                    {t("header.signIn")}
                                </Button>
                            </SignInButton>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label={t("header.openMenu")}
                        aria-expanded={isMobileMenuOpen}
                        aria-controls="mobile-navigation"
                        className="flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none lg:hidden"
                    >
                        <Menu aria-hidden="true" className="size-5" />
                    </button>
                </div>
            </div>

            {/* Search overlay: kept inside the header so the toolbar never
                unmounts (no layout shift, focus stays predictable). */}
            {isSearchOpen && (
                <>
                    <div
                        className="fixed inset-0 top-16 z-30 bg-background/60 backdrop-blur-xs"
                        onClick={closeSearch}
                        aria-hidden="true"
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={t("common.search")}
                        className="absolute inset-x-0 top-full z-40 border-b bg-background/98 shadow-lg backdrop-blur-md"
                    >
                        <div className="flex w-full items-center gap-2 px-4 py-3 sm:px-6 lg:px-8 xl:px-12">
                            <SearchBar
                                value={searchQuery}
                                onChange={setSearchQuery}
                                autoFocus
                                className="max-w-none flex-1"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={closeSearch}
                                aria-label={t("header.closeSearch")}
                                className="size-10 shrink-0 rounded-xl"
                            >
                                <X aria-hidden="true" className="size-5" />
                            </Button>
                        </div>
                    </div>
                </>
            )}

            <MobileMenu
                id="mobile-navigation"
                open={isMobileMenuOpen}
                onOpenChange={setIsMobileMenuOpen}
                items={navItems}
                activeRoute={activeRoute}
            />
        </header>
    )
}
