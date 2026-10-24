import { lazy, Suspense } from "react"
import { BarChart3 } from "lucide-react"
const MultiServerChart = lazy(() => import("./MultiServerChart").then(m => ({ default: m.MultiServerChart })))
import { useLanguage } from "@/core/contexts/LanguageContext"
import { SearchBar } from "@/ui/layout/SearchBar"
import { ChartLoadingOverlay, ChartLoadingSpinner } from "@/ui/components/ChartLoadingOverlay"
import { TimeIntervalSelector } from "@/ui/components/TimeIntervalSelector"
import { SelectedServersTags } from "@/pages/compare/components/SelectedServersTags"
import { useCompareRecords } from "@/pages/compare/hooks/useCompareRecords"
import type { MetaFunction } from "react-router"
import type { Language } from "@/core/lib/i18n"
import { resolveMetaLanguage, siteTitle, staticPageMeta, translateMeta, type DocumentMeta, type RouteMetaHandle } from "@/core/lib/seo-meta"
import { PageContainer } from "@/ui/layout/PageContainer"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    return staticPageMeta({ ...compareMetaStrings(lang), path: "/compare" })
}

function compareMetaStrings(lang: Language): DocumentMeta {
    return {
        title: siteTitle(lang, "comparison.title"),
        description: translateMeta(lang, "comparison.noSelectionDesc"),
    }
}

export const handle: RouteMetaHandle = {
    getDocumentMeta: (_data: unknown, lang: Language) => compareMetaStrings(lang),
}

export default function ServerComparison() {
    const { t } = useLanguage()
    const {
        selectedServers,
        searchQuery,
        setSearchQuery,
        addServer,
        removeServer,
        selectedRange,
        setSelectedRange,
        selectedInterval,
        setSelectedInterval,
        customRange,
        setCustomRange,
        timeRanges,
        intervals,
        chartData,
        serverNames,
        timeRange,
        loadingRecords,
        zoomResetId,
        isChartZoomedRef,
    } = useCompareRecords()

    return (
        <>
            <PageContainer className="flex flex-col gap-8 pt-6 pb-12">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                        <div className="flex min-w-0 items-center gap-2 text-info">
                            <BarChart3 className="h-6 w-6 shrink-0" />
                            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground truncate">{t("comparison.title")}</h1>
                        </div>
                    </div>

                    <div className="w-full max-w-2xl">
                        <SearchBar
                            value={searchQuery}
                            onChange={setSearchQuery}
                            onSelect={addServer}
                            placeholder={t("comparison.placeholder")}
                            className="h-10"
                        />
                    </div>

                    <SelectedServersTags
                        selectedServers={selectedServers}
                        removeServer={removeServer}
                    />
                </div>

                <div className="relative flex w-full">
                    {selectedServers.length > 0 && (
                        <Suspense fallback={<div className="min-h-[420px] w-full animate-pulse rounded-xl bg-muted/10 sm:min-h-[520px]" />}>
                            <MultiServerChart
                                data={chartData}
                                serverNames={serverNames}
                                timeRange={timeRange}
                                zoomResetId={zoomResetId}
                                onZoomChange={(z) => isChartZoomedRef.current = z}
                                isLoading={loadingRecords}
                                overlay={
                                    loadingRecords && (
                                        <ChartLoadingOverlay>
                                            <ChartLoadingSpinner label={t("serverDetail.chartLoading")} />
                                        </ChartLoadingOverlay>
                                    )
                                }
                                timeSelector={
                                    <TimeIntervalSelector
                                        selectedRange={selectedRange}
                                        setSelectedRange={setSelectedRange}
                                        selectedInterval={selectedInterval}
                                        setSelectedInterval={setSelectedInterval}
                                        customRange={customRange}
                                        setCustomRange={setCustomRange}
                                        timeRanges={timeRanges}
                                        intervals={intervals}
                                        containerClassName="w-full lg:w-auto"
                                        t={t}
                                    />
                                }
                            />
                        </Suspense>
                    )}

                    {!loadingRecords && selectedServers.length === 0 && (
                        <div className="w-full min-h-[320px] sm:min-h-[520px] flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/30 px-4 py-10 text-center">
                            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                            <div className="text-center">
                                <p className="text-muted-foreground font-medium">{t("comparison.noSelection")}</p>
                                <p className="text-xs text-muted-foreground/70">{t("comparison.noSelectionDesc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </PageContainer>
        </>
    )
}
