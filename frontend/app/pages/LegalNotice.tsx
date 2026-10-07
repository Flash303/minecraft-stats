
import { useLanguage } from "@/core/contexts/LanguageContext"
import { legalReplacements } from "@/core/lib/legal-info"

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export default function LegalNotice() {
    const { t } = useLanguage()

    return (
        <>
            <div className="max-w-4xl mx-auto px-4 py-12 select-text">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    {t("legal.notice.title")}
                </h1>
                <p className="text-sm text-muted-foreground mb-8">
                    {t("legal.notice.lastUpdated", legalReplacements)}
                </p>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg mb-6 leading-relaxed">
                        {t("legal.notice.p1", legalReplacements)}
                    </p>

                    {SECTIONS.map((num) => (
                        <div key={num}>
                            <h2 className="text-xl font-semibold mt-8 mb-4">
                                {t(`legal.notice.s${num}Title`)}
                            </h2>
                            <p className="mb-4 leading-relaxed text-foreground">
                                {t(`legal.notice.s${num}Content`, legalReplacements)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
