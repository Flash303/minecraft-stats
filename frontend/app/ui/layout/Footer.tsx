import { Link } from "react-router"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Heart } from "lucide-react"
import logo from "@/assets/logo.webp"
import { useAuth } from "@clerk/react"

export function Footer() {
    const { t } = useLanguage()
    const { isSignedIn } = useAuth()
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-border/60 bg-background/80 backdrop-blur-xs select-none">
            <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left side: Site branding & info */}
                <div className="flex flex-col gap-2 max-w-sm">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" loading="lazy" decoding="async" className="h-6 w-6 object-contain rounded-md" />
                        <span className="font-bold text-foreground tracking-tight">
                            {t("header.title")}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                        {t("footer.description")}
                    </p>
                </div>

                {/* Right side: Links & Credits */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs font-semibold text-muted-foreground">
                    <Link to="/" className="hover:text-primary transition-colors">
                        {t("footer.home")}
                    </Link>
                    <Link to="/compare" className="hover:text-primary transition-colors">
                        {t("common.compare")}
                    </Link>
                    {isSignedIn && (
                        <Link to="/?tab=mine" className="hover:text-primary transition-colors">
                            {t("common.myServers")}
                        </Link>
                    )}
                    <Link to="/terms" className="hover:text-primary transition-colors">
                        {t("footer.terms")}
                    </Link>
                    <Link to="/privacy" className="hover:text-primary transition-colors">
                        {t("footer.privacy")}
                    </Link>
                    <a 
                        href="https://github.com/Flash303/minecraft-stats" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-primary transition-colors"
                    >
                        {t("footer.github")}
                    </a>
                </div>
            </div>

            {/* Bottom Row: Copyright & Technology stack info */}
            <div className="max-w-6xl mx-auto px-6 py-5 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-muted-foreground">
                <div>
                    &copy; {currentYear} {t("header.title")}. {t("footer.rights")}
                </div>
                <div className="flex items-center gap-1">
                    <span>{t("footer.madeWith")}</span>
                    <Heart className="h-3 w-3 text-destructive fill-destructive animate-pulse" />
                    <span>{t("footer.forCommunity")}</span>
                </div>
            </div>
        </footer>
    )
}
