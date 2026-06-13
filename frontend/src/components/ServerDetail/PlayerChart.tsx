import { useMemo, useRef, useEffect } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"
import { prepareSingleChartData, formatAxisTick, formatTooltipDateTime } from "@/lib/chartUtils"

interface PlayerDataPoint {
    date: number
    value: number
}

interface PlayerChartProps {
    data: PlayerDataPoint[]
    serverName: string
    interval: number
    timeRange: {
        from: number
        to: number
    }
}

export function PlayerChart({ data, serverName, interval, timeRange }: PlayerChartProps) {
    const { theme } = useTheme()
    const { language, t } = useLanguage()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)

    const mouseEnterRef = useRef<(() => void) | null>(null)
    const mouseLeaveRef = useRef<(() => void) | null>(null)

    // Ajustement de la taille responsive
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

    // Transformation des données : Tri + Injection de NULL pour casser les lignes
    // (This block is not changed but shown for context)

    // Transformation des données : Tri + Injection de NULL pour casser les lignes
    const chartData = useMemo(() => prepareSingleChartData(data, interval), [data, interval])

    // Configuration du Plugin Tooltip
    const tooltipPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                init: (u: uPlot) => {
                    const overlay = document.createElement("div")
                    overlay.className = "pointer-events-none absolute z-50 rounded bg-black/90 px-3 py-2 text-xs text-white shadow-lg font-sans leading-relaxed"
                    overlay.style.display = "none"
                    overlay.style.position = "fixed"
                    u.over.appendChild(overlay)

                    tooltipRef.current = overlay

                    const onMouseEnter = () => { if (tooltipRef.current) tooltipRef.current.style.display = "block" }
                    const onMouseLeave = () => { if (tooltipRef.current) tooltipRef.current.style.display = "none" }

                    mouseEnterRef.current = onMouseEnter
                    mouseLeaveRef.current = onMouseLeave

                    u.over.addEventListener("mouseenter", onMouseEnter)
                    u.over.addEventListener("mouseleave", onMouseLeave)
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
                    const yVal = u.data[1][idx]

                    if (xVal == null || yVal == null) {
                        overlay.style.display = "none"
                        return
                    }

                    const locale = language === "fr" ? "fr-FR" : "en-US"
                    const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"))

                    overlay.innerHTML = `
                        <div class="font-semibold text-blue-400">${serverName}</div>
                        <div class="text-slate-300">📅 ${dateTimeStr}</div>
                        <div class="font-medium">👥 ${new Intl.NumberFormat(locale).format(Math.round(yVal))} ${t("common.players")}</div>
                    `

                    const left = u.cursor.left ?? 0
                    const top = u.cursor.top ?? 0
                    const rect = u.over.getBoundingClientRect()

                    let tooltipLeft = rect.left + left + 15
                    const tooltipWidth = overlay.offsetWidth || 180
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
                destroy: (u: uPlot) => {
                    if (mouseEnterRef.current) u.over.removeEventListener("mouseenter", mouseEnterRef.current)
                    if (mouseLeaveRef.current) u.over.removeEventListener("mouseleave", mouseLeaveRef.current)

                    tooltipRef.current?.remove()
                    tooltipRef.current = null
                    mouseEnterRef.current = null
                    mouseLeaveRef.current = null
                }
            }
        }
    }, [serverName, language, t])

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
            height: window.innerWidth < 640 ? 300 : 450,
            title: `${t("common.players_on")} ${serverName}`,
            plugins: [tooltipPlugin],
            scales: {
                x: {
                    time: true,
                    min: timeRange.from,
                    max: timeRange.to,
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
    }, [serverName, theme, tooltipPlugin, timeRange, language, t])

    if (data.length === 0) {
        return <p className="text-center py-4 text-slate-400">{t("comparison.noSelection")}</p>
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-end items-center gap-4">
                <span className="text-xs text-muted-foreground italic">
                    {t("common.pointsCount", { count: String(data.length) })}
                </span>
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    {t("comparison.resetZoom")}
                </Button>
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
