import { Link } from "react-router-dom"
import { useLanguage } from "@/contexts/LanguageContext"
import { Heart } from "lucide-react"
import logo from "@/assets/logo.png"

export function Footer() {
    const { t } = useLanguage()
    const currentYear = new Date().getFullYear()

    return (
        <footer className="border-t border-slate-200/60 dark:border-zinc-800/60 bg-slate-50/30 dark:bg-zinc-950/20 backdrop-blur-xs select-none">
            <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left side: Site branding & info */}
                <div className="flex flex-col gap-2 max-w-sm">
                    <div className="flex items-center gap-2">
                        <img src={logo} alt="Logo" className="h-6 w-6 object-contain rounded-md" />
                        <span className="font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                            {t("header.title")}
                        </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 leading-relaxed">
                        Plateforme analytique moderne pour serveurs Minecraft. Suivez, comparez et observez l'activité de vos serveurs favoris en temps réel.
                    </p>
                </div>

                {/* Right side: Links & Credits */}
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    <Link to="/" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors">
                        Accueil
                    </Link>
                    <Link to="/compare" className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors">
                        {t("common.compare")}
                    </Link>
                    <a 
                        href="https://github.com" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:text-indigo-650 dark:hover:text-indigo-400 transition-colors"
                    >
                        GitHub
                    </a>
                </div>
            </div>

            {/* Bottom Row: Copyright & Technology stack info */}
            <div className="max-w-6xl mx-auto px-6 py-5 border-t border-slate-200/40 dark:border-zinc-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-400 dark:text-zinc-505">
                <div>
                    &copy; {currentYear} {t("header.title")}. Tous droits réservés.
                </div>
                <div className="flex items-center gap-1">
                    <span>Fait avec</span>
                    <Heart className="h-3 w-3 text-rose-500 fill-rose-500 animate-pulse" />
                    <span>pour la communauté Minecraft</span>
                </div>
            </div>
        </footer>
    )
}
