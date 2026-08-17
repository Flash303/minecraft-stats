import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { LabyModServer } from "@/lib/labymod"
import type { LunarServer } from "@/lib/lunar"
import { ExternalLink, Gamepad2, Users, Search, Globe, ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"
import { FaTwitter, FaTiktok, FaInstagram, FaDiscord, FaYoutube, FaFacebook, FaTeamspeak, FaReddit } from "react-icons/fa6"
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
    teamspeak: { icon: FaTeamspeak, colorClass: "text-[#5687C8]" },
    reddit: { icon: FaReddit, colorClass: "text-[#FF4500]" }
}
const LunarLogo = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 167.8 152.86" className={className} fill="currentColor">
        <g id="Top_LC"><path d="M162,55.81v63l-11-.68V58.76a18.53,18.53,0,0,0-9.83-16.16L94.23,15.83a20.54,20.54,0,0,0-19.66,0L27.74,42.6a18.51,18.51,0,0,0-9.83,16.16v59.35l-11.06.67v-63A22.92,22.92,0,0,1,18.32,36L72.94,3.07a22.94,22.94,0,0,1,22.92,0L150.49,36A22.93,22.93,0,0,1,162,55.81Z"></path></g><g id="Bottom_LC"><polygon points="167.8 125.73 167.8 122.7 0 122.7 0 125.73 14.99 125.73 14.99 129.49 0 129.49 0 132.51 26.33 132.51 26.33 136.27 2.94 136.27 2.94 139.3 39.99 139.3 39.99 143.06 21.24 143.06 21.24 146.08 63.31 146.08 63.31 149.84 57.34 149.84 57.34 152.86 111.48 152.86 111.48 149.84 104.73 149.84 104.73 146.08 146.56 146.08 146.56 143.06 128.29 143.06 128.29 139.3 164.86 139.3 164.86 136.27 142.57 136.27 142.57 132.51 167.8 132.51 167.8 129.49 154.44 129.49 154.44 125.73 167.8 125.73"></polygon></g><g id="Star_1_LC"><polygon points="27.8 51.27 28.73 54.55 32.01 55.48 28.73 56.42 27.8 59.7 26.86 56.42 23.58 55.48 26.86 54.55 27.8 51.27"></polygon></g><g id="Star_2_LC"><polygon points="120.61 43.11 121.54 46.4 124.82 47.33 121.54 48.26 120.61 51.55 119.67 48.26 116.39 47.33 119.67 46.4 120.61 43.11"></polygon></g><g id="Star_3_LC"><polygon points="82.41 23.71 83.34 27 86.62 27.93 83.34 28.86 82.41 32.15 81.47 28.86 78.19 27.93 81.47 27 82.41 23.71"></polygon></g><g id="Star_4_LC"><polygon points="94.56 60.37 95.49 63.66 98.78 64.59 95.49 65.52 94.56 68.8 93.63 65.52 90.34 64.59 93.63 63.66 94.56 60.37"></polygon></g><g id="Star_5_LC"><polygon points="76.92 49.4 78.13 53.67 82.41 54.88 78.13 56.1 76.92 60.37 75.71 56.1 71.44 54.88 75.71 53.67 76.92 49.4"></polygon></g><g id="Star_6_LC"><polygon points="102.81 79.11 104.02 83.38 108.29 84.59 104.02 85.8 102.81 90.07 101.59 85.8 97.32 84.59 101.59 83.38 102.81 79.11"></polygon></g><g id="Moon_LC"><path d="M110.14,104.23A51.82,51.82,0,0,1,67.55,30.89a51.82,51.82,0,1,0,66.29,69.83A51.64,51.64,0,0,1,110.14,104.23Z"></path></g><g id="Star_7_LC"><polygon points="29.74 98.37 31.32 103.97 36.93 105.56 31.32 107.15 29.74 112.75 28.15 107.15 22.55 105.56 28.15 103.97 29.74 98.37"></polygon></g><g id="Star_8_LC"><polygon points="130.03 70.52 131.92 77.21 138.62 79.11 131.92 81 130.03 87.7 128.13 81 121.44 79.11 128.13 77.21 130.03 70.52"></polygon></g>
    </svg>
);

interface ServerSidebarProps {
    labyServerInfo?: LabyModServer;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    labyManifest?: any;
    lunarServerInfo?: LunarServer;
    serverName: string;
}

export function ServerSidebar({ labyServerInfo, labyManifest, lunarServerInfo, serverName }: ServerSidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showAllGamemodes, setShowAllGamemodes] = useState(false);
    const [showAllLunarGamemodes, setShowAllLunarGamemodes] = useState(false);
    const { t } = useLanguage();



    const social = labyServerInfo?.social || {};
    const gamemodes = labyServerInfo?.gamemodes || {};
    const user_stats = labyServerInfo?.user_stats;
    const hasSocials = social && Object.keys(social).length > 0;
    const hasGamemodes = gamemodes && Object.keys(gamemodes).length > 0;

    const labyIcon = labyServerInfo?.attachments?.find(a => a.file_name === 'icon.webp')?.url;

    let labyScore = 0;
    if (labyServerInfo) {
        labyScore += Object.keys(social).length;
        if (user_stats) labyScore += 1;
        labyScore += Object.keys(gamemodes).length;
        if (labyManifest?.supported_languages) labyScore += labyManifest.supported_languages.length;
        if (labyManifest?.yt_trailer) labyScore += 1;
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
    }

    const initialSource = lunarScore > labyScore && lunarServerInfo ? 'lunar' : (labyServerInfo ? 'laby' : 'lunar');
    const [activeSource, setActiveSource] = useState<'laby' | 'lunar'>(initialSource);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [progress, setProgress] = useState(0);
    
    const canSwitch = !!(labyServerInfo && lunarServerInfo);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !user_stats) return;
        
        // Replace known placeholders like {userName} or {player}
        const url = user_stats.replace(/{(userName|player|username)}/i, encodeURIComponent(searchQuery.trim()));
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleSwitch = (manual = false) => {
        if (!canSwitch || isTransitioning) return;
        if (manual) setProgress(0); // reset progress if user manually switched
        setIsTransitioning(true);
        setTimeout(() => {
            setActiveSource(prev => prev === 'laby' ? 'lunar' : 'laby');
            setProgress(0); // reset progress
            setIsTransitioning(false);
        }, 200);
    };

    useEffect(() => {
        if (!canSwitch || isTransitioning) return; // pause timer during transition

        const interval = setInterval(() => {
            setProgress((prev) => (prev >= 100 ? 100 : prev + 1));
        }, 100); // 100 * 100ms = 10s pour switch

        return () => clearInterval(interval);
    }, [canSwitch, isTransitioning, activeSource]); // reset interval when source or state changes

    useEffect(() => {
        if (progress >= 100 && !isTransitioning) {
            handleSwitch();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [progress, isTransitioning]);

    const isLaby = activeSource === 'laby';

    const renderHeader = () => (
        <div className={cn("relative flex flex-col space-y-1.5 p-6 pb-4 border-b transition-colors duration-300", isLaby ? "bg-primary/5 border-primary/10" : "bg-sky-500/5 border-sky-500/10")}>
            <div className="flex items-center justify-between">
                <h3 className="font-semibold leading-none tracking-tight text-lg flex items-center gap-2">
                    {isLaby ? (
                        <img src="https://laby.net/logo.svg" alt="LabyMod" className="w-5 h-5 object-contain drop-shadow-md dark:brightness-100 brightness-0" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                        <LunarLogo className="w-5 h-5 text-sky-500" />
                    )}
                    {isLaby ? t("serverDetail.sidebar.labymodInfo") : "Lunar Client Info"}
                </h3>
                {canSwitch && (
                    <div className="flex items-center gap-1 z-10">
                        <button onClick={() => handleSwitch(true)} disabled={isTransitioning} className="p-1 hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 text-muted-foreground">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleSwitch(true)} disabled={isTransitioning} className="p-1 hover:bg-muted/50 rounded-md transition-colors disabled:opacity-50 text-muted-foreground">
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
        return (
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
        return (
            <div className="p-4 flex flex-col gap-6">
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
                                        className="group flex items-center gap-2 text-sm hover:text-sky-500 transition-colors p-2 rounded-md hover:bg-muted"
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
                                    className="group flex items-center gap-2 text-sm hover:text-sky-500 transition-colors p-2 rounded-md hover:bg-muted"
                                >
                                    <SOCIAL_ICONS.web.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", SOCIAL_ICONS.web.colorClass)} />
                                    <span className="truncate capitalize">Website</span>
                                </a>
                            )}
                            {lunarServerInfo.store && (
                                <a 
                                    href={lunarServerInfo.store}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-2 text-sm hover:text-sky-500 transition-colors p-2 rounded-md hover:bg-muted"
                                >
                                    <SOCIAL_ICONS.web_shop.icon className={cn("w-4 h-4 shrink-0 transition-transform group-hover:scale-110", SOCIAL_ICONS.web_shop.colorClass)} />
                                    <span className="truncate capitalize">Store</span>
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
                        <h3 className="text-sm font-semibold text-muted-foreground">Minecraft Versions</h3>
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
