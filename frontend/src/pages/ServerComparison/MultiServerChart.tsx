import { useMemo, useRef, useEffect } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { BarChart3 } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"
import { formatAxisTick, formatTooltipDateTime } from "@/lib/chartUtils"

interface MultiServerChartProps {
    data: uPlot.AlignedData
    serverNames: string[]
    timeRange: {
        from: number
        to: number
    }
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

export function MultiServerChart({ data, serverNames, timeRange }: MultiServerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)

    const mouseEnterRef = useRef<(() => void) | null>(null)
    const mouseLeaveRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                const height = window.innerWidth < 640 ? 300 : 450
                chartRef.current.setSize({
                    width: containerRef.current.clientWidth - 32, // account for padding (p-4 = 16px*2)
                    height: height
                })
            }
        }

        const resizeObserver = new ResizeObserver(handleResize)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        // Trigger immediate resize check
        handleResize()

        return () => {
            resizeObserver.disconnect()
        }
    }, [data])

    const tooltipPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                init: (u: uPlot) => {
                    const overlay = document.createElement("div")
                    overlay.className = "pointer-events-none absolute z-50 rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md font-sans leading-relaxed min-w-[220px] transition-opacity duration-150"
                    overlay.style.display = "none"
                    overlay.style.position = "fixed"
                    u.over.appendChild(overlay)

                    tooltipRef.current = overlay
                },
                setCursor: (u: uPlot) => {
                    const overlay = tooltipRef.current
                    if (!overlay) return

                    const idx = u.cursor.idx

                    if (idx == null || idx < 0) {
                        overlay.style.display = "none"
                        return
                    }

                    const xVal = u.data[0][idx]
                    if (xVal == null) {
                        overlay.style.display = "none"
                        return
                    }

                    const locale = language === "fr" ? "fr-FR" : "en-US"
                    const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"))

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
                                        <span class="text-slate-300 font-medium">${name}</span>
                                    </div>
                                    <span class="font-bold text-white">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                                </div>
                            `
                        }
                    }

                    overlay.innerHTML = `
                        <div class="border-b border-white/10 pb-1.5 mb-1.5 text-slate-400 font-semibold flex items-center gap-1.5">📅 ${dateTimeStr}</div>
                        <div class="space-y-1">${rowsHtml}</div>
                    `

                    const left = u.cursor.left ?? 0
                    const top = u.cursor.top ?? 0
                    const rect = u.over.getBoundingClientRect()

                    let tooltipLeft = rect.left + left + 15
                    const tooltipWidth = overlay.offsetWidth || 220
                    if (tooltipLeft + tooltipWidth > window.innerWidth - 10) {
                        tooltipLeft = rect.left + left - tooltipWidth - 15
                    }
                    if (tooltipLeft < 10) {
                        tooltipLeft = 10
                    }

                    overlay.style.left = `${tooltipLeft}px`
                    overlay.style.top = `${rect.top + top - 15}px`
                    overlay.style.display = "block"
                },
                destroy: (_u: uPlot) => {
                    tooltipRef.current?.remove()
                    tooltipRef.current = null
                    mouseEnterRef.current = null
                    mouseLeaveRef.current = null
                }
            }
        }
    }, [serverNames, language, t])

    const handleResetZoom = () => {
        if (chartRef.current) {
            chartRef.current.setScale("x", { min: timeRange.from, max: timeRange.to })
            chartRef.current.setScale("y", {
                min: undefined as unknown as number,
                max: undefined as unknown as number
            })
        }
    }

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
            height: window.innerWidth < 640 ? 300 : 450,
            plugins: [tooltipPlugin],
            cursor: {
                drag: { setScale: true }
            },
            scales: {
                x: {
                    time: true,
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
    }, [serverNames, theme, tooltipPlugin, timeRange, language, t])

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 items-start">
                <h2 className="flex items-center gap-2 text-lg font-semibold truncate w-full sm:w-auto">
                    <BarChart3 className="text-primary h-5 w-5 shrink-0" />
                    <span className="truncate">{t("serverDetail.playerHistory")}</span>
                </h2>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    <Button variant="outline" size="sm" onClick={handleResetZoom}>
                        {t("comparison.resetZoom")}
                    </Button>
                </div>
            </div>

            <div ref={containerRef} className="w-full bg-card p-4 rounded-xl border shadow-sm">
                {data[0].length === 0 ? (
                    <p className="text-center py-4 text-slate-400 font-medium animate-pulse">
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
