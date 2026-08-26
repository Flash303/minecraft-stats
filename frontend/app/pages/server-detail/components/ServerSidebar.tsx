import { useState, useEffect, useRef } from "react"
import { Input } from "@/ui/components/input"
import { Button } from "@/ui/components/button"
import type { LabyModServer } from "@/core/lib/labymod"
import type { LunarServer } from "@/core/lib/lunar"
import { ExternalLink, Search, Globe, ShoppingCart, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"
import { FaTwitter, FaTiktok, FaInstagram, FaDiscord, FaYoutube, FaFacebook, FaTeamspeak, FaReddit } from "react-icons/fa6"
import { BiSupport } from "react-icons/bi"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"
import { LunarLogo } from "@/ui/components/LunarLogo"
import { LabyLogo } from "@/ui/components/LabyLogo"

// Import icons mapping for social links
const SOCIAL_ICONS: Record<string, { icon: React.ElementType, colorClass: string }> = {
    web: { icon: Globe, colorClass: "text-blue-500" },
    web_shop: { icon: ShoppingCart, colorClass: "text-emerald-500" },
    web_support: { icon: BiSupport, colorClass: "text-amber-500" },
    twitter: { icon: FaTwitter, colorClass: "text-sky-500" },
    tiktok: { icon: FaTiktok, colorClass: "text-foreground" },
    instagram: { icon: FaInstagram, colorClass: "text-pink-600" },
    discord: { icon: FaDiscord, colorClass: "text-[#5865F2]" },
    youtube: { icon: FaYoutube, colorClass: "text-red-600" },
    facebook: { icon: FaFacebook, colorClass: "text-blue-600" },
    teamspeak: { icon: FaTeamspeak, colorClass: "text-[#5687C8]" },
    reddit: { icon: FaReddit, colorClass: "text-[#FF4500]" }
}

interface ServerSidebarProps {
    labyServerInfo?: LabyModServer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labyManifest?: any;
    lunarServerInfo?: LunarServer;
}

export function ServerSidebar({ labyServerInfo, labyManifest, lunarServerInfo }: ServerSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllGamemodes, setShowAllGamemodes] = useState(false);
    const [showAllLunarGamemodes, setShowAllLunarGamemodes] = useState(false);
    const { t, language } = useLanguage();

    const social = labyServerInfo?.social || {};
    const gamemodes = labyServerInfo?.gamemodes || {};
    const user_stats = labyServerInfo?.user_stats;
    const hasSocials = social && Object.entries(social).some(([, v]) => !!v);
    const hasGamemodes = gamemodes && Object.keys(gamemodes).length > 0;

    let labyScore = 0;
    if (labyServerInfo) {
        labyScore += Object.entries(social).filter(([, v]) => !!v).length;
        if (user_stats) labyScore += 1;
        labyScore += Object.keys(gamemodes).length;
        if (labyManifest?.supported_languages) labyScore += labyManifest.supported_languages.length;
        if (labyManifest?.yt_trailer) labyScore += 1;
        if (labyServerInfo.partnered) labyScore += 1;
    }

    let lunarScore = 0;
    if (lunarServerInfo) {
        if (lunarServerInfo.description) lunarScore += 1;
        if (lunarServerInfo.socials) lunarScore += Object.keys(lunarServerInfo.socials).length;
        if (lunarServerInfo.website) lunarScore += 1;
        if (lunarServerInfo.store) lunarScore += 1;
        if (lunarServerInfo.gameTypes) lunarScore += lunarServerInfo.gameTypes.length;
        if (lunarServerInfo.languages) lunarScore += lunarServerInfo.languages.length;
        if (lunarServerInfo.minecraftVersions) lunarScore += lunarServerInfo.minecraftVersions.length;
        if (lunarServerInfo.presentationVideo) lunarScore += 1;
        if (lunarServerInfo.partnered) lunarScore += 1;
    }

    const bestSource = lunarScore > labyScore && lunarServerInfo ? 'lunar' : (labyServerInfo ? 'laby' : 'lunar');
    const [activeSource, setActiveSource] = useState<'laby' | 'lunar'>(bestSource);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isAutoSwitching, setIsAutoSwitching] = useState(true);

    // Reset activeSource when the server changes (component persists between navigations)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setActiveSource(bestSource);
        setProgress(0);
        setIsAutoSwitching(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [labyServerInfo, lunarServerInfo]);

    const canSwitch = !!(labyServerInfo && lunarServerInfo);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !user_stats) return;
        
        // Replace known placeholders like {userName} or {player}
        const url = user_stats.replace(/{(userName|player|username)}/i, encodeURIComponent(searchQuery.trim()));
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const switchTimerRef = useRef<number | null>(null);

    // Nettoie le timer de transition au démontage
    useEffect(() => {
        return () => {
            if (switchTimerRef.current !== null) clearTimeout(switchTimerRef.current);
        };
    }, []);

    const handleSwitch = (manual = false) => {
        if (!canSwitch || isTransitioning) return;
        if (manual) {
            setProgress(0); // reset progress if user manually switched
            setIsAutoSwitching(false); // disable auto switch on manual action
        }
        setIsTransitioning(true);
        if (switchTimerRef.current !== null) clearTimeout(switchTimerRef.current);
        switchTimerRef.current = window.setTimeout(() => {
            setActiveSource(prev => prev === 'laby' ? 'lunar' : 'laby');
            setProgress(0); // reset progress
            setIsTransitioning(false);
        }, 200);
    };

    useEffect(() => {
        if (!canSwitch || isTransitioning || !isAutoSwitching) return; // pause timer during transition or when disabled

        const interval = setInterval(() => {
            setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
        }, 100); // 100 * 100ms = 10s pour switch

        return () => clearInterval(interval);
    }, [canSwitch, isTransitioning, activeSource, isAutoSwitching]); // reset interval when source or state changes

    useEffect(() => {
        if (progress >= 100 && !isTransitioning) {
            const timer = setTimeout(() => {
                handleSwitch();
            }, 0);
            return () => clearTimeout(timer);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, isTransitioning]);

    const isLaby = activeSource === 'laby';

    const renderHeader = () => (
        <div className={cn("relative flex flex-col space-y-1.5 p-6 pb-4 border-b transition-colors duration-300", isLaby ? "bg-primary/5 border-primary/10" : "bg-sky-500/5 border-sky-500/10")}>
            <div className="flex items-center justify-between">
                <h3 className="font-semibold leading-none tracking-tight text-lg flex items-center gap-2">
                    {isLaby ? (
                        <LabyLogo className={cn("w-5 h-5", labyServerInfo?.partnered ? "text-cyan-500" : "text-foreground")} />
                    ) : (
                        <LunarLogo className={cn("w-5 h-5", lunarServerInfo?.partnered ? "text-orange-500" : "text-sky-500")} />
                    )}
                    {isLaby ? t("serverDetail.sidebar.labymodInfo") : t("serverDetail.sidebar.lunarInfo")}
                </h3>
                {canSwitch && (
                    <div className="flex items-center gap-1 z-10">
                        <button
                            type="button"
                            onClick={() => setIsAutoSwitching(!isAutoSwitching)}
                            className="p-1 hover:bg-muted/50 rounded-md transition-colors text-muted-foreground mr-1"
                            title={isAutoSwitching ? "Pause auto-switch" : "Play auto-switch"}
                            aria-label={isAutoSwitching ? "Pause auto-switch" : "Play auto-switch"}
                            aria-pressed={isAutoSwitching}
                        >
                            {isAutoSwitching ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => handleSwitch(true)} disabled={isTransitioning} aria-label={t("serverDetail.sidebar.labymodInfo")} className="p-1 hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 text-muted-foreground">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button type="button" onClick={() => handleSwitch(true)} disabled={isTransitioning} aria-label={t("serverDetail.sidebar.lunarInfo")} className="p-1 hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 text-muted-foreground">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            {canSwitch && (
                <div className="absolute bottom-0 left-0 h-[2px] bg-foreground/10 w-full overflow-hidden">
                    <div 
                        className={cn("h-full transition-all duration-100 ease-linear", isLaby ? "bg-primary" : "bg-sky-500")}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );

    const renderLabyBody = () => {
        if (!labyServerInfo) return null;

        const hasContent = labyServerInfo.partnered || hasSocials || user_stats || hasGamemodes
            || (labyManifest?.supported_languages?.length > 0)
            || labyManifest?.yt_trailer;

        if (!hasContent) {
            return (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <LabyLogo className="text-muted-foreground/40 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                        {language === "fr"
                            ? "Ce serveur est référencé sur LabyMod mais n'a pas encore renseigné ses informations."
                            : "This server is registered on LabyMod but hasn't filled in its information yet."}
                    </p>
                    <a
                        href={`https://github.com/LabyMod/server-media`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-xs transition-colors"
                    >
                        <ExternalLink className="h-3 w-3" />
                        LabyMod Server List
                    </a>
                </div>
            )
        }

        return (
            <div className="p-4 flex flex-col gap-6">
                {labyServerInfo.partnered && (
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-cyan-500/10 text-cyan-600 dark:text-cyan-500 border border-cyan-500/20 rounded-lg shadow-sm">
                        <LabyLogo className="w-5 h-5 shrink-0" />
                        <span className="font-bold text-sm tracking-tight">Official LabyMod Partner</span>
                    </div>
                )}
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
                                        <span className="truncate capitalize">{platform === 'web' ? t("serverDetail.sidebar.web") : platform.replace('web_shop', 'shop').replace('web_support', 'support')}</span>
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
                            {(showAllGamemodes ? Object.entries(gamemodes) : Object.entries(gamemodes).slice(0, 15)).map(([key, mode]) => (
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
                            {Object.keys(gamemodes).length > 15 && (
                                <button 
                                    onClick={() => setShowAllGamemodes(!showAllGamemodes)}
                                    className="inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
                                >
                                    {showAllGamemodes ? t("serverDetail.sidebar.showLess") : t("serverDetail.sidebar.showMore").replace("{count}", (Object.keys(gamemodes).length - 15).toString())}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {labyManifest?.supported_languages && labyManifest.supported_languages.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.languages")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {labyManifest.supported_languages.map((lang: string) => {
                                const code = lang.toLowerCase();
                                const flagCode = {
                                    en: 'gb', ja: 'jp', zh: 'cn', ko: 'kr',
                                    da: 'dk', cs: 'cz', el: 'gr', sv: 'se',
                                    he: 'il', ar: 'sa'
                                }[code] || code;
                                
                                return (
                                    <div key={lang} className="flex items-center gap-1.5 uppercase text-xs font-semibold px-2 py-1 bg-muted/50 rounded-md border text-muted-foreground transition-colors hover:bg-muted" title={lang}>
                                        <img
                                            src={`https://flagcdn.com/w20/${flagCode}.png`}
                                            alt={lang}
                                            className="w-4 h-auto rounded-[1px] shadow-sm"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <span>{lang}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {labyManifest?.yt_trailer && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.trailer")}</h3>
                        <div className="aspect-video w-full rounded-md overflow-hidden border">
                            <iframe 
                                src={`https://www.youtube.com/embed/${labyManifest.yt_trailer}`}
                                title="YouTube Trailer"
                                className="w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderLunarBody = () => {
        if (!lunarServerInfo) return null;

        const hasLunarContent = lunarServerInfo.partnered || lunarServerInfo.description
            || (lunarServerInfo.socials && Object.keys(lunarServerInfo.socials).length > 0)
            || lunarServerInfo.website || lunarServerInfo.store
            || (lunarServerInfo.gameTypes && lunarServerInfo.gameTypes.length > 0)
            || (lunarServerInfo.languages && lunarServerInfo.languages.length > 0)
            || (lunarServerInfo.minecraftVersions && lunarServerInfo.minecraftVersions.length > 0)
            || lunarServerInfo.presentationVideo;

        if (!hasLunarContent) {
            return (
                <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <LunarLogo className="text-muted-foreground/40 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                        {language === "fr"
                            ? "Ce serveur est référencé sur Lunar Client mais n'a pas encore renseigné ses informations."
                            : "This server is registered on Lunar Client but hasn't filled in its information yet."}
                    </p>
                    <a
                        href="https://github.com/LunarClient/ServerMappings/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground inline-flex items-center gap-1.5 text-xs transition-colors hover:text-primary"
                    >
                        <ExternalLink className="h-3 w-3" />
                        Lunar Client Servers
                    </a>
                </div>
            )
        }

        return (
            <div className="p-4 flex flex-col gap-6">
                {lunarServerInfo.partnered && (
                    <div className="flex items-center gap-2.5 px-3 py-2 bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20 rounded-lg shadow-sm">
                        <LunarLogo className="w-5 h-5 shrink-0" />
                        <span className="font-bold text-sm tracking-tight">Official Lunar Partner</span>
                    </div>
                )}
                {lunarServerInfo.description && (
                    <p className="text-sm text-muted-foreground">
                        {lunarServerInfo.description}
                    </p>
                )}

                {lunarServerInfo.socials && Object.keys(lunarServerInfo.socials).length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.socials")}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(lunarServerInfo.socials).map(([platform, link]) => {
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
                                        <span className="truncate capitalize">{platform}</span>
                                    </a>
                                );
                            })}
                            {lunarServerInfo.website && (
                                <a 
                                    href={lunarServerInfo.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-muted"
                                >
                                    <SOCIAL_ICONS.web.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", SOCIAL_ICONS.web.colorClass)} />
                                    <span className="truncate capitalize">{t("serverDetail.sidebar.website")}</span>
                                </a>
                            )}
                            {lunarServerInfo.store && (
                                <a 
                                    href={lunarServerInfo.store}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-sm hover:text-primary transition-colors p-2 rounded-md hover:bg-muted"
                                >
                                    <SOCIAL_ICONS.web_shop.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", SOCIAL_ICONS.web_shop.colorClass)} />
                                    <span className="truncate capitalize">{t("serverDetail.sidebar.store")}</span>
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {lunarServerInfo.gameTypes && lunarServerInfo.gameTypes.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.gamemodes")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {(showAllLunarGamemodes ? lunarServerInfo.gameTypes : lunarServerInfo.gameTypes.slice(0, 15)).map((mode) => (
                                <span 
                                    key={mode}
                                    className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-muted/50 text-foreground transition-colors"
                                >
                                    {mode}
                                </span>
                            ))}
                            {lunarServerInfo.gameTypes.length > 15 && (
                                <button 
                                    onClick={() => setShowAllLunarGamemodes(!showAllLunarGamemodes)}
                                    className="inline-flex items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-foreground"
                                >
                                    {showAllLunarGamemodes ? t("serverDetail.sidebar.showLess") : t("serverDetail.sidebar.showMore").replace("{count}", (lunarServerInfo.gameTypes.length - 15).toString())}
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                {lunarServerInfo.languages && lunarServerInfo.languages.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.languages")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {lunarServerInfo.languages.map((lang: string) => {
                                const code = lang.toLowerCase();
                                const flagCode = {
                                    en: 'gb', ja: 'jp', zh: 'cn', ko: 'kr',
                                    da: 'dk', cs: 'cz', el: 'gr', sv: 'se',
                                    he: 'il', ar: 'sa'
                                }[code] || code;
                                
                                return (
                                    <div key={lang} className="flex items-center gap-1.5 uppercase text-xs font-semibold px-2 py-1 bg-muted/50 rounded-md border text-muted-foreground transition-colors hover:bg-muted" title={lang}>
                                        <img
                                            src={`https://flagcdn.com/w20/${flagCode}.png`}
                                            alt={lang}
                                            className="w-4 h-auto rounded-[1px] shadow-sm"
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        />
                                        <span>{lang}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {lunarServerInfo.minecraftVersions && lunarServerInfo.minecraftVersions.length > 0 && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.minecraftVersions")}</h3>
                        <div className="flex flex-wrap gap-2">
                            {lunarServerInfo.minecraftVersions.map((v) => (
                                <span 
                                    key={v}
                                    className={cn(
                                        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold",
                                        v === lunarServerInfo.primaryMinecraftVersion ? "bg-sky-500/10 text-sky-600 border-sky-500/20" : "bg-muted/50 text-muted-foreground"
                                    )}
                                >
                                    {v}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {lunarServerInfo.presentationVideo && (
                    <div className="flex flex-col gap-3">
                        <h3 className="text-sm font-semibold text-muted-foreground">{t("serverDetail.sidebar.trailer")}</h3>
                        <div className="aspect-video w-full rounded-md overflow-hidden border">
                            <iframe 
                                src={`https://www.youtube.com/embed/${lunarServerInfo.presentationVideo}`}
                                title="YouTube Trailer"
                                className="w-full h-full"
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (!labyServerInfo && !lunarServerInfo) {
        return null;
    }

    return (
        <div className="flex flex-col gap-6 w-full lg:w-80 shrink-0">
            <div className={cn(
                "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-colors duration-300", 
                isLaby ? "border-primary/20" : "border-sky-500/20"
            )}>
                {renderHeader()}
                <div className={cn("transition-opacity duration-200", isTransitioning ? "opacity-0" : "opacity-100")}>
                    {isLaby ? renderLabyBody() : renderLunarBody()}
                </div>
            </div>
        </div>
    )
}
