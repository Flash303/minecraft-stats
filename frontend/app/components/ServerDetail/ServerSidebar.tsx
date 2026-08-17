import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { LabyModServer } from "@/lib/labymod"
import { ExternalLink, Gamepad2, Users, Search, Globe, ShoppingCart } from "lucide-react"
import { FaTwitter, FaTiktok, FaInstagram, FaDiscord, FaYoutube, FaFacebook, FaTeamspeak } from "react-icons/fa6"
import { BiSupport } from "react-icons/bi"
import { useLanguage } from "@/contexts/LanguageContext"
import { cn } from "@/lib/utils"

// Import icons mapping for social links
const SOCIAL_ICONS: Record<string, { icon: React.ElementType, colorClass: string }> = {
    web: { icon: Globe, colorClass: "text-blue-500" },
    web_shop: { icon: ShoppingCart, colorClass: "text-emerald-500" },
    web_support: { icon: BiSupport, colorClass: "text-amber-500" },
    twitter: { icon: FaTwitter, colorClass: "text-sky-500" },
    tiktok: { icon: FaTiktok, colorClass: "text-slate-900 dark:text-white" },
    instagram: { icon: FaInstagram, colorClass: "text-pink-600" },
    discord: { icon: FaDiscord, colorClass: "text-[#5865F2]" },
    youtube: { icon: FaYoutube, colorClass: "text-red-600" },
    facebook: { icon: FaFacebook, colorClass: "text-blue-600" },
    teamspeak: { icon: FaTeamspeak, colorClass: "text-[#5687C8]" }
}

interface ServerSidebarProps {
    labyServerInfo?: LabyModServer;
    serverName: string;
}

export function ServerSidebar({ labyServerInfo, serverName }: ServerSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const { t } = useLanguage();

    if (!labyServerInfo) {
        return null;
    }

    const { social, gamemodes, user_stats } = labyServerInfo;
    const hasSocials = social && Object.keys(social).length > 0;
    const hasGamemodes = gamemodes && Object.keys(gamemodes).length > 0;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !user_stats) return;
        
        // Replace known placeholders like {userName} or {player}
        const url = user_stats.replace(/{(userName|player|username)}/i, encodeURIComponent(searchQuery.trim()));
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex flex-col gap-6 w-full lg:w-80 shrink-0">
            {/* LabyMod Integration Card */}
            <div className="overflow-hidden rounded-xl border border-primary/20 bg-card text-card-foreground shadow-sm">
                <div className="flex flex-col space-y-1.5 p-6 bg-primary/5 pb-4 border-b border-primary/10">
                    <h3 className="font-semibold leading-none tracking-tight text-lg flex items-center gap-2">
                        <img src="https://dl.labymod.net/img/labymod_logo.png" alt="LabyMod" className="w-5 h-5 object-contain" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                        {t("serverDetail.sidebar.labymodInfo")}
                    </h3>
                </div>
                <div className="p-4 flex flex-col gap-6">
                    {hasSocials && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.socials")}</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(social).map(([platform, link]) => {
                                    if (!link) return null;
                                    const iconData = SOCIAL_ICONS[platform] || { icon: ExternalLink, colorClass: "" };
                                    const Icon = iconData.icon;
                                    const isUrl = link.startsWith('http');
                                    const href = isUrl ? link : (platform === 'twitter' ? `https://twitter.com/${link}` : `https://${platform}.com/${link}`);
                                    
                                    return (
                                        <a 
                                            key={platform}
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-muted"
                                        >
                                            <Icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", iconData.colorClass)} />
                                            <span className="truncate capitalize">{platform.replace('web_shop', 'shop').replace('web_support', 'support')}</span>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {user_stats && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.playerStats")}</h3>
                            <form onSubmit={handleSearch} className="flex gap-2">
                                <Input 
                                    placeholder={t("serverDetail.sidebar.searchPlayer")} 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="h-9 text-sm"
                                />
                                <Button type="submit" size="sm" className="h-9 px-3" disabled={!searchQuery.trim()}>
                                    <Search className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    )}

                    {hasGamemodes && (
                        <div className="flex flex-col gap-3">
                            <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.gamemodes")}</h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(gamemodes).map(([key, mode]) => (
                                    <span 
                                        key={key}
                                        className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                        style={{ 
                                            backgroundColor: mode.color ? `${mode.color}20` : 'var(--muted)',
                                            color: mode.color || 'inherit',
                                            borderColor: mode.color ? `${mode.color}50` : 'var(--border)'
                                        }}
                                        title={mode.command}
                                    >
                                        {mode.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Placeholder for future Lunar section */}
            {/* 
            <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm opacity-50">
                <div className="flex flex-col space-y-1.5 p-6 bg-muted/30 pb-4">
                    <h3 className="font-semibold leading-none tracking-tight text-lg flex items-center gap-2 text-muted-foreground">
                        Lunar Client Info
                    </h3>
                </div>
                <div className="p-4">
                    <p className="text-sm text-muted-foreground italic">Coming soon...</p>
                </div>
            </div>
            */}
        </div>
    )
}
