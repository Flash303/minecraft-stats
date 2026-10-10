import { useMemo } from "react"
import { Link } from "react-router"
import { BarChart3, ChevronDown, CircleHelp } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { Button } from "@/ui/components/button"

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
        <section
            className="mx-auto max-w-6xl px-2 py-12"
            aria-labelledby="faq-heading"
        >
            <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                <div className="self-start lg:sticky lg:top-24">
                    <div className="flex items-center gap-2 text-primary">
                        <CircleHelp className="h-6 w-6 shrink-0" />
                        <h2
                            id="faq-heading"
                            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                        >
                            {t("faq.title")}
                        </h2>
                    </div>
                    <div className="mt-6">
                        <Button variant="outline" asChild>
                            <Link to="/compare">
                                <BarChart3 />
                                {t("comparison.title")}
                            </Link>
                        </Button>
                    </div>
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
                            <p className="mt-3 leading-relaxed text-muted-foreground">
                                {item.a}
                            </p>
                        </details>
                    ))}
                </div>
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
