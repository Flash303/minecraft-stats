
import type { MetaFunction } from "react-router"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { legalReplacements } from "@/core/lib/legal-info"
import { translate } from "@/core/lib/i18n"
import { resolveMetaLanguage, siteTitle, staticPageMeta, truncateDescription } from "@/core/lib/seo-meta"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    return staticPageMeta({
        title: siteTitle(lang, "legal.privacy.title"),
        description: truncateDescription(translate(lang, "legal.privacy.p1", legalReplacements)),
        path: "/privacy",
    })
}

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const

export default function Privacy() {
    const { t } = useLanguage()

    return (
        <>
            <div className="max-w-4xl mx-auto px-4 py-12 select-text">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                    {t("legal.privacy.title")}
                </h1>
                <p className="text-sm text-muted-foreground mb-8">
                    {t("legal.privacy.lastUpdated", legalReplacements)}
                </p>

                <div className="prose prose-slate dark:prose-invert max-w-none">
                    <p className="text-lg mb-6 leading-relaxed">
                        {t("legal.privacy.p1", legalReplacements)}
                    </p>

                    {SECTIONS.map((num) => (
                        <div key={num}>
                            <h2 className="text-xl font-semibold mt-8 mb-4">
                                {t(`legal.privacy.s${num}Title`)}
                            </h2>
                            <p className="mb-4 leading-relaxed text-foreground">
                                {t(`legal.privacy.s${num}Content`, legalReplacements)}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </>
    )
}
