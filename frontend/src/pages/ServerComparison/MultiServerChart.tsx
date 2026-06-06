import { useMemo, useRef, useEffect } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/LanguageContext"

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
                chartRef.current.setSize({
                    width: containerRef.current.clientWidth,
                    height: 500
                })
            }
        }

        const resizeObserver = new ResizeObserver(handleResize)
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current)
        }

        return () => {
            resizeObserver.disconnect()
        }
    }, [])

    const tooltipPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                init: (u: uPlot) => {
                    const overlay = document.createElement("div")
                    overlay.className = "pointer-events-none absolute z-50 rounded bg-black/90 px-3 py-2 text-xs text-white shadow-lg font-sans leading-relaxed min-w-[200px]"
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
                    if (xVal == null) {
                        overlay.style.display = "none"
                        return
                    }

                    const d = new Date(xVal * 1000)
                    const locale = language === "fr" ? "fr-FR" : "en-US"
                    const dateStr = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
                    const timeStr = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: language !== "fr" })

                    let rowsHtml = ""

                    for (let i = 1; i < u.data.length; i++) {
                        const yVal = u.data[i][idx]
                        if (yVal !== null && yVal !== undefined) {
                            const name = serverNames[i - 1]
                            const color = COLORS[(i - 1) % COLORS.length]
                            rowsHtml += `
                                <div class="flex items-center justify-between gap-4 py-0.5">
                                    <div class="flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
                                        <span class="text-slate-300">${name}</span>
                                    </div>
                                    <span class="font-bold">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                                </div>
                            `
                        }
                    }

                    overlay.innerHTML = `
                        <div class="border-b border-white/10 pb-1 mb-1 text-slate-400">📅 ${dateStr} ${t("common.time")} ${timeStr}</div>
                        ${rowsHtml}
                    `

                    const left = u.cursor.left ?? 0
                    const top = u.cursor.top ?? 0
                    const rect = u.over.getBoundingClientRect()

                    overlay.style.left = `${rect.left + left + 15}px`
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
                    const d = new Date(val * 1000)
                    const dateStr = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
                    const timeStr = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: language !== "fr" })
                    return `${dateStr} ${t("common.time")} ${timeStr}`
                }
            }
        ]

        for (let i = 0; i < serverNames.length; i++) {
            const color = COLORS[i % COLORS.length]
            series.push({
                label: serverNames[i],
                stroke: color,
                width: 2,
                spanGaps: true,
                value: (_u: uPlot, val: number) => {
                    if (val == null) return ""
                    return new Intl.NumberFormat(locale).format(Math.round(val))
                }
            })
        }

        return {
            width: containerRef.current?.clientWidth ?? 800,
            height: 500,
            plugins: [tooltipPlugin],
            cursor: {
                drag: { setScale: true }
            },
            scales: {
                x: {
                    time: true,
                    min: timeRange.from,
                    max: timeRange.to,
                },
                y: { auto: true }
            },
            axes: [
                {
                    stroke: textColor,
                    grid: { stroke: gridColor },
                    values: (_u: uPlot, vals: number[]) => vals.map(v => {
                        if (v == null) return ""
                        const d = new Date(v * 1000)
                        
                        if (d.getHours() === 0 && d.getMinutes() === 0) {
                            const day = d.getDate().toString().padStart(2, "0")
                            const month = (d.getMonth() + 1).toString().padStart(2, "0")
                            return language === "fr" ? `${day}/${month}` : `${month}/${day}`
                        }

                        return d.toLocaleTimeString(locale, {
                            hour: "2-digit", 
                            minute: "2-digit", 
                            hour12: language !== "fr" 
                        })
                    })
                },
                {
                    stroke: textColor,
                    grid: { stroke: gridColor },
                }
            ],
            series: series
        } as uPlot.Options
    }, [serverNames, theme, tooltipPlugin, timeRange, language, t])

    if (data[0].length === 0) {
        return <p className="text-center py-4 text-slate-400">{t("comparison.noSelection")}</p>
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    {t("comparison.resetZoom")}
                </Button>
            </div>

            <div ref={containerRef} className="w-full bg-card p-2 rounded-lg border">
                <UplotReact
                    options={options}
                    data={data}
                    onCreate={(chart) => {
                        chartRef.current = chart
                    }}
                />
            </div>
        </div>
    )
}
