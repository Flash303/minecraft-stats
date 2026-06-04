import { useMemo, useRef, useEffect } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"

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

export function PlayerChart({ data, serverName, timeRange }: PlayerChartProps) {
    const { theme } = useTheme()
    const chartRef = useRef<uPlot | null>(null)
    const tooltipRef = useRef<HTMLDivElement | null>(null)

    const mouseEnterRef = useRef<(() => void) | null>(null)
    const mouseLeaveRef = useRef<(() => void) | null>(null)

    // Ajustement de la taille responsive
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current) {
                const parent = document.getElementById("chart-container")
                if (parent) {
                    chartRef.current.setSize({
                        width: parent.clientWidth,
                        height: 500
                    })
                }
            }
        }

        window.addEventListener("resize", handleResize)
        handleResize()

        return () => window.removeEventListener("resize", handleResize)
    }, [])

    // Transformation des données : Tri + Injection de NULL pour casser les lignes
    const chartData = useMemo<uPlot.AlignedData>(() => {
        if (!data || data.length === 0) return [[], []]

        const sorted = [...data].sort((a, b) => a.date - b.date)

        const timestamps: number[] = []
        const values: (number | null)[] = []

        const MAX_GAP_SECONDS = 30 * 60

        for (let i = 0; i < sorted.length; i++) {
            const currentPoint = sorted[i]
            const currentX = currentPoint.date > 1000000000000 ? currentPoint.date / 1000 : currentPoint.date

            if (timestamps.length > 0) {
                const prevX = timestamps[timestamps.length - 1]
                const diff = currentX - prevX

                if (diff > MAX_GAP_SECONDS) {
                    timestamps.push(prevX + 1)
                    values.push(null)
                }
            }

            timestamps.push(currentX)
            values.push(currentPoint.value)
        }

        return [timestamps, values]
    }, [data])

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

                    const d = new Date(xVal * 1000)
                    const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                    const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })

                    overlay.innerHTML = `
                        <div class="font-semibold text-blue-400">${serverName}</div>
                        <div class="text-slate-300">📅 ${dateStr} à ${timeStr}</div>
                        <div class="font-medium">👥 ${Math.round(yVal)} joueurs en ligne</div>
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
    }, [serverName])

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

        return {
            width: 1000,
            height: 500,
            title: `Joueurs sur ${serverName}`,
            plugins: [tooltipPlugin],
            scales: {
                x: {
                    time: true,
                    min: timeRange.from,
                    max: timeRange.to,
                    // Le garde-fou ultime s'implémente ici
                    range: (u: uPlot, min: number, max: number) => {
                        const xData = u.data[0]
                        const yData = u.data[1]

                        if (!xData || xData.length === 0) return [min, max]

                        // On compte combien de points réels (non-null) se trouvent dans la zone visée par le zoom
                        let pointsCount = 0
                        for (let i = 0; i < xData.length; i++) {
                            if (xData[i] >= min && xData[i] <= max) {
                                if (yData[i] !== null) {
                                    pointsCount++
                                }
                            }
                            if (xData[i] > max) break
                        }

                        // Si le zoom isole moins de 2 points, on refuse le changement
                        // en retournant les bornes actuelles de la scale X
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
                    values: (_u: uPlot, vals: number[]) => vals.map(v => {
                        if (v == null) return ""
                        const d = new Date(v * 1000)
                        const hours = d.getHours().toString().padStart(2, "0")
                        const minutes = d.getMinutes().toString().padStart(2, "0")

                        if (d.getHours() === 0 && d.getMinutes() === 0) {
                            const day = d.getDate().toString().padStart(2, "0")
                            const month = (d.getMonth() + 1).toString().padStart(2, "0")
                            return `${day}/${month}`
                        }

                        return `${hours}:${minutes}`
                    })
                },
                {
                    stroke: textColor,
                    grid: { stroke: gridColor },
                    values: (_u: uPlot, vals: number[]) => vals.map(v => Math.round(v).toString())
                }
            ],
            series: [
                {
                    label: "Temps",
                    value: (_u: uPlot, val: number) => {
                        if (val == null) return ""
                        const d = new Date(val * 1000)
                        const dateStr = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
                        const timeStr = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
                        return `${dateStr} à ${timeStr}`
                    }
                },
                {
                    label: "Joueurs",
                    stroke: strokeColor,
                    fill: fillColor,
                    width: 2,
                    spanGaps: false
                }
            ]
        } as uPlot.Options
    }, [serverName, theme, tooltipPlugin, timeRange])

    if (data.length === 0) {
        return <p className="text-center py-4 text-slate-400">Aucune donnée disponible</p>
    }

    return (
        <div className="w-full space-y-4">
            <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleResetZoom}>
                    Reset Zoom
                </Button>
            </div>

            <div id="chart-container" className="w-full bg-card p-2 rounded-lg border">
                <UplotReact
                    options={options}
                    data={chartData}
                    onCreate={(chart) => {
                        chartRef.current = chart
                    }}
                />
            </div>
        </div>
    )
}