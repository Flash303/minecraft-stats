import { Users, TrendingUp, TrendingDown } from "lucide-react"

interface StatsSectionProps {
    stats: {
        max: number
        min: number
        avg: number
    }
    locale: string
    t: (key: string) => string
}

export function StatsSection({ stats, locale, t }: StatsSectionProps) {
    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                {t("common.stats.title")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.average")}</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-3xl font-extrabold text-slate-800 dark:text-white">{new Intl.NumberFormat(locale).format(stats.avg)}</span>
                        <TrendingUp className="h-5 w-5 text-blue-500/80 opacity-80" />
                    </div>
                </div>
                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 text-emerald-600 dark:text-emerald-450">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.max")}</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-3xl font-extrabold">{new Intl.NumberFormat(locale).format(stats.max)}</span>
                        <TrendingUp className="h-5 w-5 opacity-80" />
                    </div>
                </div>
                <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/80 rounded-xl p-5 flex flex-col gap-1 shadow-sm backdrop-blur-sm hover:shadow-md transition-all duration-300 text-rose-600 dark:text-rose-450">
                    <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t("common.stats.min")}</span>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-3xl font-extrabold">{new Intl.NumberFormat(locale).format(stats.min)}</span>
                        <TrendingDown className="h-5 w-5 opacity-80" />
                    </div>
                </div>
            </div>
        </div>
    )
}
