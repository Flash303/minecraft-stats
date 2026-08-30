/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo, useRef } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/core/contexts/ThemeContext"
import { Button } from "@/ui/components/button"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { prepareSingleChartData, formatAxisTick, formatTooltipDateTime } from "@/core/lib/chartUtils"
import {
    useChartResize,
    useTouchInteractPlugin,
    useTooltipPlugin,
    useChartZoomControls,
    makeXScaleRange,
    sizeChartToContainer,
} from "@/core/hooks/useChartPlugins"
import { cn } from "@/core/lib/utils"
import { resolveToken, withAlpha } from "@/core/lib/theme-colors"
import { ClientOnly } from "@/ui/components/ClientOnly"

interface PlayerChartProps {
    data: { date: number; value: number }[]
    serverName: string
    interval?: number
    timeRange?: { from: number, to: number }
    onVisibleRangeChange?: (min: number, max: number) => void
    onZoomChange?: (isZoomed: boolean) => void
    header?: React.ReactNode
    timeSelector?: React.ReactNode
    zoomResetId?: string
    isRateLimited?: boolean
    isLoading?: boolean
    overlay?: React.ReactNode
}

export function PlayerChart({ data, serverName, interval, timeRange, onVisibleRangeChange, onZoomChange, header, timeSelector, zoomResetId, isRateLimited, isLoading, overlay }: PlayerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Ajustement de la taille responsive
    useChartResize(chartRef, containerRef, [data])

    const timeRangeRef = useRef(timeRange)
    timeRangeRef.current = timeRange

    // Transformation des données : Tri + Injection de NULL pour casser les lignes
    const chartData = useMemo(() => prepareSingleChartData(data, interval), [data, interval])

    // Configuration du Plugin Tooltip
    const tooltipPlugin = useTooltipPlugin({
        language,
        t,
        tooltipWidth: 180,
        deps: [],
        renderRowsHtml: (u, idx, locale) => {
            const yVal = u.data[1][idx]
            if (yVal == null) return ""

            const strokeColor = resolveToken("--primary")

            return `
                <div class="flex items-center gap-2 py-0.5">
                    <div class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${strokeColor}"></div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-white">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                        <span class="text-muted-foreground text-2xs uppercase">${t("common.players")}</span>
                    </div>
                </div>
            `
        }
    })

    const disableLegendClickPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                ready: (u: uPlot) => {
                    const legend = u.root.querySelector('.u-legend') as HTMLElement
                    if (legend) {
                        legend.style.pointerEvents = 'none'
                    }
                }
            }
        }
    }, [])

    const touchInteractPlugin = useTouchInteractPlugin()

    // Zoom : plugin de suivi, reset et effets partagés avec MultiServerChart
    const { isZoomed, scaleHookPlugin, resetZoom: handleResetZoom } = useChartZoomControls({
        chartRef,
        timeRange,
        zoomResetId,
        onZoomChange,
        onVisibleRangeChange,
    })

    const hasData = data.length > 0
    // Configuration globale du graphique
    const options = useMemo(() => {
        const isDark = theme === "dark"
        const strokeColor = resolveToken("--info")
        const fillColor = withAlpha(strokeColor, isDark ? 0.15 : 0.1)
        const gridColor = resolveToken("--chart-grid")
        const textColor = resolveToken("--chart-axis-text")
        const locale = language === "fr" ? "fr-FR" : "en-US"

        return {
            width: 800,
            height: (typeof window !== "undefined" && window.innerWidth < 640) ? 300 : 450,
            title: `${t("common.players_on")} ${serverName}`,
            padding: [20, 15, 10, 10],
            plugins: [tooltipPlugin, scaleHookPlugin, disableLegendClickPlugin, touchInteractPlugin],
            cursor: {
                y: false,
                drag: { 
                    x: typeof window !== "undefined" ? window.innerWidth >= 640 : true, 
                    y: false, 
                    setScale: typeof window !== "undefined" ? window.innerWidth >= 640 : true 
                }
            },
            scales: {
                x: {
                    time: true,
                    auto: false,
                    min: timeRangeRef.current?.from ?? 0,
                    max: timeRangeRef.current?.to ?? 0,
                    range: makeXScaleRange({
                        countNonNullValues: true,
                        getTimeRange: () => timeRangeRef.current
                    })
                },
                y: { auto: true }
            },
            axes: [
                {
                    stroke: textColor,
                    grid: { stroke: gridColor },
                    values: (_u: uPlot, vals: number[]) => vals.map(v => formatAxisTick(v, language, locale))
                },
                {
                    stroke: textColor,
                    grid: { stroke: gridColor },
                    values: (_u: uPlot, vals: number[]) => vals.map(v => Math.round(v).toString())
                }
            ],
            series: [
                {
                    label: t("common.date"),
                    value: (_u: uPlot, val: number) => {
                        if (val == null) return ""
                        return formatTooltipDateTime(val, language, locale, t("common.time"))
                    }
                },
                {
                    label: t("common.players_maj"),
                    stroke: strokeColor,
                    fill: fillColor,
                    width: 2,
                    spanGaps: false,
                    value: (_u: uPlot, val: number) => {
                        if (val == null) return ""
                        return new Intl.NumberFormat(locale).format(Math.round(val)) + ` ${t("common.players")}`
                    }
                }
            ]
        } as uPlot.Options
    }, [serverName, theme, tooltipPlugin, touchInteractPlugin, language, t, hasData])

    if (data.length === 0) {
        return (
            <div className="w-full space-y-4">
                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 items-start">
                    <div className="w-full lg:w-auto overflow-hidden">{header}</div>
                    <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                        {timeSelector && (
                            <div className="w-full sm:w-auto">
                                {timeSelector}
                            </div>
                        )}
                    </div>
                </div>
                <div className="relative w-full bg-card p-4 rounded-xl border shadow-sm min-h-[332px] sm:min-h-[482px] flex items-center justify-center">
                    {overlay}
                    <div className={cn(
                        "w-full transition-opacity duration-200 flex items-center justify-center",
                        isLoading ? "opacity-30 pointer-events-none" : "opacity-100"
                    )}>
                        <p className="text-center py-4 text-muted-foreground font-medium">
                            {isRateLimited ? t("common.rateLimited") : t("common.noDataForRange")}
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 items-start">
                <div className="w-full lg:w-auto overflow-hidden">{header}</div>
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground italic whitespace-nowrap">
                            {t("common.pointsCount", { count: String(data.length) })}
                        </span>
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
                    </div>
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
                        isLoading
                            ? "pointer-events-none opacity-30 [&_.hide-on-load]:opacity-0"
                            : "opacity-100"
                    )}
                >
                    <ClientOnly fallback={<div style={{ height: options.height }} className="w-full" />}>
                        <UplotReact
                            options={options}
                            data={chartData}
                            onCreate={(chart) => {
                                chartRef.current = chart
                                // Force resize to container width after creation
                                sizeChartToContainer(chart, containerRef.current)
                            }}
                        />
                    </ClientOnly>
                </div>
            </div>
        </div>
    )
}
