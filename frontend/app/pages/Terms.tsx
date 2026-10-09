
import type { MetaFunction } from "react-router"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { legalReplacements } from "@/core/lib/legal-info"
import { translate } from "@/core/lib/i18n"
import { resolveMetaLanguage, siteTitle, staticPageMeta, truncateDescription } from "@/core/lib/seo-meta"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    return staticPageMeta({
        title: siteTitle(lang, "legal.terms.title"),
        description: truncateDescription(translate(lang, "legal.terms.p1")),
        path: "/terms",
    })
}

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export default function Terms() {
    const { t } = useLanguage()

    return (
        <>
            <div className="max-w-4xl mx-auto px-4 py-12 select-text">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    {t("legal.terms.title")}
                </h1>
                <p className="text-sm text-muted-foreground mb-8">
                    {t("legal.terms.lastUpdated", legalReplacements)}
                </p>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg mb-6 leading-relaxed">
                        {t("legal.terms.p1")}
                    </p>

                    {SECTIONS.map((num) => (
                        <div key={num}>
                            <h2 className="text-xl font-semibold mt-8 mb-4">
                                {t(`legal.terms.s${num}Title`)}
                            </h2>
                            <p className="mb-4 leading-relaxed text-foreground">
                                {t(`legal.terms.s${num}Content`)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
