
import { useLanguage } from "@/contexts/LanguageContext"

export function Privacy() {
    const { t } = useLanguage()

    return (
        <>
            <div className="max-w-4xl mx-auto px-4 py-12 select-text">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-zinc-100 mb-2">
                    {t("legal.privacy.title")}
                </h1>
                <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
                    {t("legal.privacy.lastUpdated", { date: "15 June 2026" })}
                </p>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg mb-6 leading-relaxed">
                        {t("legal.privacy.p1")}
                    </p>

                    {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                        <div key={num}>
                            <h2 className="text-xl font-semibold mt-8 mb-4">
                                {t(`legal.privacy.s${num}Title`)}
                            </h2>
                            <p className="mb-4 leading-relaxed text-slate-700 dark:text-zinc-300">
                                {t(`legal.privacy.s${num}Content`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
