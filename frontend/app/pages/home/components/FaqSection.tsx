import { useMemo } from "react"
import { ChevronDown, CircleHelp } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"

const FAQ_COUNT = 5

export function FaqSection() {
    const { t } = useLanguage()

    const items = useMemo(
        () =>
            Array.from({ length: FAQ_COUNT }, (_, i) => ({
                q: t(`faq.q${i + 1}`),
                a: t(`faq.a${i + 1}`),
            })),
        [t]
    )

    const schema = useMemo(
        () => ({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: items.map((item) => ({
                "@type": "Question",
                name: item.q,
                acceptedAnswer: { "@type": "Answer", text: item.a },
            })),
        }),
        [items]
    )

    return (
        <section className="mx-auto max-w-4xl px-4 py-12" aria-labelledby="faq-heading">
            <div className="mb-6 flex items-center gap-2">
                <CircleHelp className="h-6 w-6 shrink-0 text-primary" />
                <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-foreground">
                    {t("faq.title")}
                </h2>
            </div>
            <div className="flex flex-col gap-3">
                {items.map((item, i) => (
                    <details
                        key={i}
                        className="group rounded-xl border border-border/80 bg-card px-5 py-4 shadow-xs"
                    >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
                            {item.q}
                            <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>
                        <p className="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
                    </details>
                ))}
            </div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
                }}
            />
        </section>
    )
}
