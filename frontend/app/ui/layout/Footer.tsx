import { Link } from "react-router"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Heart } from "lucide-react"
import logo from "@/assets/logo.webp"
import { useAuth } from "@clerk/react"
import { PageContainer } from "./PageContainer"

export function Footer() {
    const { t } = useLanguage()
    const { isSignedIn } = useAuth()
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-border/60 bg-background/80 backdrop-blur-xs select-none">
            <PageContainer className="flex flex-col justify-between gap-6 py-10 md:flex-row md:items-center">
                {/* Left side: Site branding & info */}
                <div className="flex max-w-sm flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="" loading="lazy" decoding="async" className="size-6 rounded-md object-contain" />
                        <span className="font-bold tracking-tight text-foreground">
                            {t("header.title")}
                        </span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        {t("footer.description")}
                    </p>
                </div>

                {/* Right side: Links & Credits */}
                <nav
                    aria-label={t("header.navigation")}
                    className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs font-semibold text-muted-foreground sm:gap-x-8"
                >
                    <Link to="/" className="transition-colors hover:text-primary">
                        {t("footer.home")}
                    </Link>
                    <Link to="/compare" className="transition-colors hover:text-primary">
                        {t("common.compare")}
                    </Link>
                    {isSignedIn && (
                        <Link to="/?tab=mine" className="transition-colors hover:text-primary">
                            {t("common.myServers")}
                        </Link>
                    )}
                    <Link to="/terms" className="transition-colors hover:text-primary">
                        {t("footer.terms")}
                    </Link>
                    <Link to="/privacy" className="transition-colors hover:text-primary">
                        {t("footer.privacy")}
                    </Link>
                    <Link to="/legal" className="transition-colors hover:text-primary">
                        {t("footer.legal")}
                    </Link>
                    <a
                        href="https://github.com/Flash303/minecraft-stats"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-colors hover:text-primary"
                    >
                        {t("footer.github")}
                    </a>
                </nav>
            </PageContainer>

            {/* Bottom Row: Copyright & Technology stack info */}
            <div className="border-t border-border/40">
                <PageContainer className="flex flex-col justify-between gap-2 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center">
                    <div>
                        &copy; {currentYear} {t("header.title")}. {t("footer.rights")}
                    </div>
                    <div className="flex items-center gap-1">
                        <span>{t("footer.madeWith")}</span>
                        <Heart className="size-3 fill-destructive text-destructive motion-safe:animate-pulse" />
                        <span>{t("footer.forCommunity")}</span>
                    </div>
                </PageContainer>
            </div>
        </footer>
    )
}
