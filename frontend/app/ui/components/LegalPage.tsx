import { useLanguage } from "@/core/contexts/LanguageContext"
import { legalReplacements } from "@/core/lib/legal-info"
import { siteTitle, translateMeta, truncateDescription, type DocumentMeta } from "@/core/lib/seo-meta"
import type { Language } from "@/core/lib/i18n"

export type LegalNamespace = "terms" | "privacy" | "notice"

const SECTIONS = [1, 2, 3, 4, 5, 6, 7] as const

/** Builds the document meta shared by all legal pages. */
export function legalMetaStrings(lang: Language, namespace: LegalNamespace): DocumentMeta {
    return {
        title: siteTitle(lang, `legal.${namespace}.title`),
        description: truncateDescription(
            translateMeta(lang, `legal.${namespace}.p1`, legalReplacements)
        ),
    }
}

/** Shared layout for the terms, privacy and legal notice pages. */
export function LegalPage({ namespace }: { namespace: LegalNamespace }) {
    const { t } = useLanguage()

    return (
        <div className="max-w-4xl mx-auto px-4 py-12 select-text">
            <h1 className="text-3xl font-bold text-foreground mb-2">
                {t(`legal.${namespace}.title`)}
            </h1>
            <p className="text-sm text-muted-foreground mb-8">
                {t(`legal.${namespace}.lastUpdated`, legalReplacements)}
            </p>

            <div className="prose prose-slate dark:prose-invert max-w-none">
                <p className="text-lg mb-6 leading-relaxed">
                    {t(`legal.${namespace}.p1`, legalReplacements)}
                </p>

                {SECTIONS.map((num) => (
                    <div key={num}>
                        <h2 className="text-xl font-semibold mt-8 mb-4">
                            {t(`legal.${namespace}.s${num}Title`)}
                        </h2>
                        <p className="mb-4 leading-relaxed text-foreground">
                            {t(`legal.${namespace}.s${num}Content`, legalReplacements)}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}
