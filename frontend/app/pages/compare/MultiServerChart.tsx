import { useMemo, useRef, useEffect, useState } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/core/contexts/ThemeContext"
import { Button } from "@/ui/components/button"
import { BarChart3 } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { formatAxisTick, formatTooltipDateTime } from "@/core/lib/chartUtils"
import { useChartResize, useTouchInteractPlugin, useTooltipPlugin } from "@/core/hooks/useChartPlugins"
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
}

const COLORS = [
    "#3b82f6", // blue
    "#ef4444", // red
    "#10b981", // emerald
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
]

export function MultiServerChart({ data, serverNames, timeRange, zoomResetId, onZoomChange, timeSelector }: MultiServerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const [isZoomed, setIsZoomed] = useState(false)
    const timeRangeRef = useRef(timeRange)
    // eslint-disable-next-line react-hooks/refs
    timeRangeRef.current = timeRange

    useChartResize(chartRef, containerRef, [data])

    const tooltipPlugin = useTooltipPlugin({
        language,
        t,
        tooltipWidth: 220,
        deps: [serverNames],
        renderRowsHtml: (u, idx, locale) => {
            let rowsHtml = ""
            for (let i = 1; i < u.data.length; i++) {
                const yVal = u.data[i][idx]
                if (yVal !== null && yVal !== undefined) {
                    const name = serverNames[i - 1]
                    const color = COLORS[(i - 1) % COLORS.length]
                    rowsHtml += `
                        <div class="flex items-center justify-between gap-4 py-0.5">
                            <div class="flex items-center gap-2">
                                <div class="w-2.5 h-2.5 rounded-full shadow-sm" style="background-color: ${color}"></div>
                                <span class="text-zinc-300 font-medium">${name}</span>
                            </div>
                            <span class="font-bold text-white">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                        </div>
                    `
                }
            }
            return rowsHtml
        }
    })

    const touchInteractPlugin = useTouchInteractPlugin()

    const scaleHookPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                setScale: (u: uPlot, key: string) => {
                    if (key === 'x' && u.scales.x.min != null && u.scales.x.max != null) {
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
    }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomResetId])

    const options = useMemo(() => {
        const isDark = theme === "dark"
        const gridColor = isDark ? "#374151" : "#e5e7eb"
        const textColor = isDark ? "#d1d5db" : "#374151"
        const locale = language === "fr" ? "fr-FR" : "en-US"

        const series: uPlot.Series[] = [
            {
                label: t("common.date"),
                value: (_u: uPlot, val: number) => {
                    if (val == null) return ""
                    return formatTooltipDateTime(val, language, locale, t("common.time"))
                }
            }
        ]

        for (let i = 0; i < serverNames.length; i++) {
            const color = COLORS[i % COLORS.length]
            series.push({
                label: serverNames[i],
                stroke: color,
                fill: color + "1a", // 10% opacity fill
                width: 2,
                spanGaps: false, // Match PlayerChart - show gaps for server offline status
                value: (_u: uPlot, val: number) => {
                    if (val == null) return ""
                    return new Intl.NumberFormat(locale).format(Math.round(val))
                }
            })
        }

        return {
            width: 800,
            height: (typeof window !== "undefined" && window.innerWidth < 640) ? 300 : 450,
            plugins: [tooltipPlugin, touchInteractPlugin, scaleHookPlugin],
            padding: [20, 15, 10, 10],
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
                    min: timeRange.from,
                    max: timeRange.to,
                    range: (u: uPlot, min: number, max: number) => {
                        const xData = u.data[0]
                        if (!xData || xData.length === 0) return [min, max]

                        let pointsCount = 0
                        for (let i = 0; i < xData.length; i++) {
                            if (xData[i] >= min && xData[i] <= max) {
                                pointsCount++
                            }
                            if (xData[i] > max) break
                        }

                        if (pointsCount < 2 && u.scales.x && u.scales.x.min != null) {
                            return [u.scales.x.min, u.scales.x.max]
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
                }
            ],
            series: series
        } as uPlot.Options
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverNames, theme, tooltipPlugin, touchInteractPlugin, timeRange, language, t])

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 items-start">
                <h2 className="flex items-center gap-2 text-lg font-semibold truncate w-full lg:w-auto">
                    <BarChart3 className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate">{t("serverDetail.playerHistory")}</span>
                </h2>
                <div className="flex flex-col xl:flex-row items-start xl:items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    {isZoomed && (
                        <Button variant="outline" size="sm" onClick={handleResetZoom}>
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

            <div ref={containerRef} className="w-full bg-card p-4 rounded-xl border shadow-sm">
                {data[0].length === 0 ? (
                    <p className="text-center py-4 text-zinc-400 font-medium animate-pulse">
                        {t("comparison.loadingData")}
                    </p>
                ) : (
                    <div className="w-full">
                        <UplotReact
                            options={options}
                            data={data}
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
                )}
            </div>
        </div>
    )
}
