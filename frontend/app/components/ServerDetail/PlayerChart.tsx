import { useMemo, useRef, useEffect, useState } from "react"
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
    data: { date: number; value: number }[]
    serverName: string
    interval?: number
    timeRange?: { from: number, to: number }
    onVisibleRangeChange?: (min: number, max: number) => void
    onZoomChange?: (isZoomed: boolean) => void
    header?: React.ReactNode
    zoomResetId?: string
}

export function PlayerChart({ data, serverName, interval, timeRange, onVisibleRangeChange, onZoomChange, header, zoomResetId }: PlayerChartProps) {
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
                    overlay.className = "pointer-events-none absolute z-50 rounded-xl border border-slate-800 bg-slate-950/90 px-3.5 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md font-sans leading-relaxed min-w-[160px] transition-opacity duration-150"
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
                    const yVal = u.data[1][idx]

                    if (xVal == null || yVal == null) {
                        overlay.style.display = "none"
                        return
                    }

                    const locale = language === "fr" ? "fr-FR" : "en-US"
                    const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"))

                    const isDark = document.documentElement.classList.contains("dark")
                    const strokeColor = isDark ? "#6366f1" : "#4f46e5"

                    overlay.innerHTML = `
                        <div class="border-b border-white/10 pb-1.5 mb-1.5 text-slate-400 font-semibold flex items-center gap-1.5">📅 ${dateTimeStr}</div>
                        <div class="space-y-1">
                            <div class="flex items-center gap-2 py-0.5">
                                <div class="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" style="background-color: ${strokeColor}"></div>
                                <div class="flex items-center gap-1.5">
                                    <span class="font-bold text-white">${new Intl.NumberFormat(locale).format(Math.round(yVal))}</span>
                                    <span class="text-slate-400 text-[10px] uppercase">${t("common.players")}</span>
                                </div>
                            </div>
                        </div>
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
                destroy: () => {
                    tooltipRef.current?.remove()
                    tooltipRef.current = null
                    mouseEnterRef.current = null
                    mouseLeaveRef.current = null
                }
            },
        }
    }, [serverName, language, t])

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

    const touchInteractPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                ready: (u: uPlot) => {
                    const over = u.over
                    // Allow vertical scrolling for 1 finger, but capture horizontal touch for scrubbing and 2 for zooming
                    over.style.touchAction = "pan-y"
                    
                    let rect: DOMRect | null = null;
                    let initialDist = 0;
                    let initialXCenter = 0;
                    let initialXMin = 0;
                    let initialXMax = 0;

                    const handleTouchStart = (e: TouchEvent) => {
                        if (e.touches.length === 2) {
                            if (e.cancelable) e.preventDefault();
                            rect = over.getBoundingClientRect();
                            const t0 = e.touches[0];
                            const t1 = e.touches[1];
                            const t0x = t0.clientX - rect.left;
                            const t1x = t1.clientX - rect.left;
                            
                            initialDist = Math.abs(t1x - t0x);
                            initialXCenter = (t0x + t1x) / 2;
                            
                            if (u.scales.x.min != null && u.scales.x.max != null) {
                                initialXMin = u.scales.x.min;
                                initialXMax = u.scales.x.max;
                            }
                        }
                    }

                    const handleTouchMove = (e: TouchEvent) => {
                        if (e.touches.length === 1) {
                            // Scrubbing
                            rect = over.getBoundingClientRect()
                            u.setCursor({
                                left: e.touches[0].clientX - rect.left,
                                top: e.touches[0].clientY - rect.top
                            })
                        } else if (e.touches.length === 2) {
                            // Pinching / Panning
                            if (e.cancelable) e.preventDefault();
                            if (!rect) rect = over.getBoundingClientRect();
                            
                            const t0 = e.touches[0];
                            const t1 = e.touches[1];
                            const t0x = t0.clientX - rect.left;
                            const t1x = t1.clientX - rect.left;
                            
                            const currentDist = Math.abs(t1x - t0x);
                            const currentXCenter = (t0x + t1x) / 2;
                            
                            if (initialDist > 0 && currentDist > 0 && u.data[0] && u.data[0].length > 0) {
                                const scale = initialDist / currentDist;
                                const xValRange = initialXMax - initialXMin;
                                const pxRange = rect.width;
                                
                                const centerVal = initialXMin + (initialXCenter / pxRange) * xValRange;
                                const newRange = xValRange * scale;
                                
                                let newXMin = centerVal - (currentXCenter / pxRange) * newRange;
                                let newXMax = newXMin + newRange;

                                const dataMin = u.data[0][0];
                                const dataMax = u.data[0][u.data[0].length - 1];
                                
                                if (dataMin != null && dataMax != null) {
                                    if (newXMin < dataMin) {
                                        newXMin = dataMin;
                                        newXMax = Math.min(dataMax, newXMin + newRange);
                                    } else if (newXMax > dataMax) {
                                        newXMax = dataMax;
                                        newXMin = Math.max(dataMin, newXMax - newRange);
                                    }
                                }
                                
                                u.setScale("x", { min: newXMin, max: newXMax });
                            }
                        }
                    }

                    over.addEventListener("touchstart", handleTouchStart, { passive: false });
                    over.addEventListener("touchmove", handleTouchMove, { passive: false });
                }
            }
        }
    }, [])

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
    }, [serverName, theme, tooltipPlugin, touchInteractPlugin, language, t])

    if (data.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                {header}
                <div className="w-full bg-card p-4 rounded-xl border shadow-sm min-h-[332px] sm:min-h-[482px] flex items-center justify-center">
                    <p className="hide-on-load transition-opacity duration-200 text-center py-4 text-slate-400 font-medium animate-pulse">{t("common.noDataForRange")}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 items-start">
                <div className="w-full sm:w-auto overflow-hidden">{header}</div>
                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-xs text-muted-foreground italic">
                        {t("common.pointsCount", { count: String(data.length) })}
                    </span>
                    {isZoomed && (
                        <Button variant="outline" size="sm" onClick={handleResetZoom}>
                            {t("comparison.resetZoom")}
                        </Button>
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
