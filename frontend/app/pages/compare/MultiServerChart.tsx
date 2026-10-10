import { useMemo, useRef } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/core/hooks/useTheme"
import { Button } from "@/ui/components/button"
import { BarChart3 } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import {
    useChartResize,
    useTouchInteractPlugin,
    useTooltipPlugin,
    useChartZoomControls,
    sizeChartToContainer,
    useEnsureOneSeriesVisiblePlugin,
} from "@/core/hooks/charts"
import { cn, escapeHtml, formatNumber } from "@/core/lib/utils"
import { chartPalette } from "@/core/lib/theme-colors"
import { ClientOnly } from "@/ui/components/ClientOnly"
import { buildMultiServerChartOptions } from "@/pages/compare/multiServerChartOptions"

interface MultiServerChartProps {
    data: uPlot.AlignedData
    serverNames: string[]
    timeRange: {
        from: number
        to: number
    }
    zoomResetId?: string
    onZoomChange?: (isZoomed: boolean) => void
    timeSelector?: React.ReactNode
    isLoading?: boolean
    overlay?: React.ReactNode
}

export function MultiServerChart({ data, serverNames, timeRange, zoomResetId, onZoomChange, timeSelector, isLoading, overlay }: MultiServerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    const hasData = data[0]?.length > 0

    const seriesColors = useMemo(() => chartPalette(serverNames.length || 1), [serverNames, theme])

    useChartResize(chartRef, containerRef, [data])

    const { isZoomed, scaleHookPlugin, resetZoom: handleResetZoom } = useChartZoomControls({
        chartRef,
        timeRange,
        zoomResetId,
        onZoomChange,
    })

    const tooltipPlugin = useTooltipPlugin({
        language,
        t,
        tooltipWidth: 220,
        deps: [serverNames, seriesColors],
        renderRowsHtml: (u, idx) => {
            let rowsHtml = ""
            for (let i = 1; i < u.data.length; i++) {
                const yVal = u.data[i][idx]
                if (yVal !== null && yVal !== undefined) {
                    const name = serverNames[i - 1]
                    const color = seriesColors[(i - 1) % seriesColors.length]
                    rowsHtml += `
                        <div class="flex items-center justify-between gap-4 py-0.5">
                            <div class="flex items-center gap-2">
                                <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${color}"></div>
                                <span class="text-muted-foreground font-medium">${escapeHtml(name)}</span>
                            </div>
                            <span class="font-bold text-white">${formatNumber(language, Math.round(yVal))}</span>
                        </div>
                    `
                }
            }
            return rowsHtml
        }
    })

    const touchInteractPlugin = useTouchInteractPlugin()
    const ensureOneSeriesVisiblePlugin = useEnsureOneSeriesVisiblePlugin()

    const options = useMemo(() => buildMultiServerChartOptions({
        serverNames,
        seriesColors,
        timeRange,
        language,
        t,
        plugins: {
            tooltip: tooltipPlugin,
            touchInteract: touchInteractPlugin,
            legendGuard: ensureOneSeriesVisiblePlugin,
            zoom: scaleHookPlugin,
        },
    }), [serverNames, seriesColors, timeRange, language, t, tooltipPlugin, touchInteractPlugin, ensureOneSeriesVisiblePlugin, scaleHookPlugin])

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 items-start">
                <h2 className="flex items-center gap-2 text-lg font-semibold truncate w-full lg:w-auto">
                    <BarChart3 className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate">{t("serverDetail.playerHistory")}</span>
                </h2>
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    {isZoomed && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleResetZoom}
                            className="bg-background/95 backdrop-blur-sm"
                        >
                            {t("comparison.resetZoom")}
                        </Button>
                    )}
                    {timeSelector && (
                        <div className="w-full sm:w-auto">
                            {timeSelector}
                        </div>
                    )}
                </div>
            </div>

            <div ref={containerRef} className="relative w-full bg-card p-4 rounded-xl border shadow-sm">
                {overlay}
                <div
                    className={cn(
                        "w-full transition-opacity duration-200",
                        isLoading ? "pointer-events-none opacity-30" : "opacity-100"
                    )}
                >
                    {hasData ? (
                        <ClientOnly fallback={<div style={{ height: options.height }} className="w-full" />}>
                            <UplotReact
                                options={options}
                                data={data}
                                onCreate={(chart) => {
                                    chartRef.current = chart
                                    sizeChartToContainer(chart, containerRef.current)
                                }}
                            />
                        </ClientOnly>
                    ) : (
                        <div className="flex min-h-[332px] w-full items-center justify-center sm:min-h-[482px]">
                            <p className="text-center py-4 text-muted-foreground font-medium">
                                {t("common.noDataForRange")}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
