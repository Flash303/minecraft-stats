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
import { translate } from "@/core/lib/i18n"
import { resolveMetaLanguage, siteTitle, staticPageMeta } from "@/core/lib/seo-meta"

export const meta: MetaFunction = ({ matches }) => {
    const lang = resolveMetaLanguage(matches)
    const title = siteTitle(lang, "comparison.title")
    const description = translate(lang, "comparison.noSelectionDesc")
    return staticPageMeta({ title, description, path: "/compare" })
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
            <div className="flex flex-col gap-8 pb-12">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4 md:items-center">
                        <div className="flex items-center gap-2 text-info">
                            <BarChart3 className="h-6 w-6 shrink-0" />
                            <h1 className="text-2xl font-extrabold tracking-tight text-foreground truncate">{t("comparison.title")}</h1>
                        </div>
                    </div>

                    <div className="max-w-2xl">
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
                        <div className="w-full min-h-[520px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl bg-muted/30 gap-4">
                            <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                            <div className="text-center">
                                <p className="text-muted-foreground font-medium">{t("comparison.noSelection")}</p>
                                <p className="text-xs text-muted-foreground/70">{t("comparison.noSelectionDesc")}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
