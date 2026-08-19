/* eslint-disable react-hooks/refs */
/* eslint-disable react-hooks/exhaustive-deps */
import { useMemo, useRef, useEffect, useState } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/core/contexts/ThemeContext"
import { Button } from "@/ui/components/button"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { prepareSingleChartData, formatAxisTick, formatTooltipDateTime } from "@/core/lib/chartUtils"
import { useChartResize, useTouchInteractPlugin, useTooltipPlugin } from "@/core/hooks/useChartPlugins"
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
}

export function PlayerChart({ data, serverName, interval, timeRange, onVisibleRangeChange, onZoomChange, header, timeSelector, zoomResetId, isRateLimited }: PlayerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)
    const [isZoomed, setIsZoomed] = useState(false)
    const timeRangeRef = useRef(timeRange)
    timeRangeRef.current = timeRange


    const mouseEnterRef = useRef<(() => void) | null>(null)
    const mouseLeaveRef = useRef<(() => void) | null>(null)

    // Ajustement de la taille responsive
    useChartResize(chartRef, containerRef, [data])

    // Transformation des données : Tri + Injection de NULL pour casser les lignes
    // (This block is not changed but shown for context)

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

            const isDark = document.documentElement.classList.contains("dark")
            const strokeColor = isDark ? "#6366f1" : "#4f46e5"

            return `
                <div class="flex items-center gap-2 py-0.5">
                    <div class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${strokeColor}"></div>
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-white">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                        <span class="text-slate-400 text-[10px] uppercase">${t("common.players")}</span>
                    </div>
                </div>
            `
        }
    })

    const scaleHookPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                setSelect: (u: uPlot) => {
                    if (u.scales.x.min != null && u.scales.x.max != null) {
                        onVisibleRangeChange?.(u.scales.x.min, u.scales.x.max)
                    }
                },
                setScale: (u: uPlot, key: string) => {
                    if (key === 'x' && u.scales.x.min != null && u.scales.x.max != null) {
                        onVisibleRangeChange?.(u.scales.x.min, u.scales.x.max)
                        const tr = timeRangeRef.current;
                        if (Math.abs(u.scales.x.min - tr.from) > 1 || Math.abs(u.scales.x.max - tr.to) > 1) {
                            setIsZoomed(true);
                        } else {
                            setIsZoomed(false);
                        }
                    }
                }
            }
        }
    }, [onVisibleRangeChange])

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

    // Reset Zoom calé directement sur les props issues du parent
    const handleResetZoom = () => {
        if (chartRef.current) {
            chartRef.current.setScale("x", { min: timeRange.from, max: timeRange.to })
            chartRef.current.setScale("y", {
                min: undefined as unknown as number,
                max: undefined as unknown as number
            })
        }
    }

    useEffect(() => {
        onZoomChange?.(isZoomed)
    }, [isZoomed, onZoomChange])

    useEffect(() => {
        if (chartRef.current && !isZoomed) {
            chartRef.current.setScale("x", { min: timeRange.from, max: timeRange.to })
        }
    }, [timeRange.from, timeRange.to, isZoomed])

    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.setScale("x", { min: timeRange.from, max: timeRange.to })
        }
    }, [zoomResetId])

    const hasData = data.length > 0
    // Configuration globale du graphique
    const options = useMemo(() => {
        const isDark = theme === "dark"
        const strokeColor = isDark ? "#60a5fa" : "#2563eb"
        const fillColor = isDark ? "rgba(96, 165, 250, 0.15)" : "rgba(37, 99, 235, 0.1)"
        const gridColor = isDark ? "#374151" : "#e5e7eb"
        const textColor = isDark ? "#d1d5db" : "#374151"
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
                    range: (u: uPlot, min: number, max: number) => {
                        const xData = u.data[0]
                        const yData = u.data[1]

                        if (!xData || xData.length === 0) return [min, max]

                        let pointsCount = 0
                        for (let i = 0; i < xData.length; i++) {
                            if (xData[i] >= min && xData[i] <= max) {
                                if (yData[i] !== null) {
                                    pointsCount++
                                }
                            }
                            if (xData[i] > max) break
                        }

                        if (pointsCount < 2 && u.scales.x && u.scales.x.min != null) {
                            if (Math.abs(min - u.scales.x.min) > 1 || Math.abs(max - u.scales.x.max) > 1) {
                                return [u.scales.x.min, u.scales.x.max]
                            }
                            const tr = timeRangeRef.current;
                            return [tr?.from ?? min, tr?.to ?? max]
                        }

                        return [min, max]
                    }
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
            <div className="flex flex-col gap-4">
                {header}
                <div className="w-full bg-card p-4 rounded-xl border shadow-sm min-h-[332px] sm:min-h-[482px] flex items-center justify-center">
                    <p className="hide-on-load transition-opacity duration-200 text-center py-4 text-slate-400 font-medium">
                        {isRateLimited ? t("common.rateLimited") : t("common.noDataForRange")}
                    </p>
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
                            <Button variant="outline" size="sm" onClick={handleResetZoom}>
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

            <div ref={containerRef} className="w-full bg-card p-4 rounded-xl border shadow-sm">
                <UplotReact
                    options={options}
                    data={chartData}
                    onCreate={(chart) => {
                        chartRef.current = chart
                        // Force resize to container width after creation
                        if (containerRef.current) {
                            const height = window.innerWidth < 640 ? 300 : 450
                            chart.setSize({
                                width: containerRef.current.clientWidth - 32, // account for padding (p-4 = 16px*2)
                                height: height
                            })
                        }
                    }}
                />
            </div>
        </div>
    )
}
