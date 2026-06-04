import { useMemo, useRef, useEffect } from "react"
import uPlot from "uplot"
import UplotReact from "uplot-react"
import "uplot/dist/uPlot.min.css"
import { useTheme } from "@/contexts/ThemeContext"

interface PlayerDataPoint {
    date: number
    value: number
}

interface MiniChartProps {
    data: PlayerDataPoint[]
}

export function MiniChart({ data }: MiniChartProps) {
    const { theme } = useTheme()
    const chartRef = useRef<uPlot | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

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

    const options = useMemo(() => {
        const isDark = theme === "dark"
        const strokeColor = isDark ? "#3b82f6" : "#2563eb"
        const fillColor = isDark ? "rgba(59, 130, 246, 0.1)" : "rgba(37, 99, 235, 0.05)"

        return {
            width: 160,
            height: 64,
            cursor: { show: false },
            legend: { show: false },
            scales: {
                x: { time: true },
                y: { auto: true }
            },
            axes: [
                { show: false },
                { show: false }
            ],
            series: [
                {},
                {
                    stroke: strokeColor,
                    fill: fillColor,
                    width: 2.5,
                    spanGaps: false,
                    points: { show: false }
                }
            ]
        } as uPlot.Options
    }, [theme])

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                chartRef.current.setSize({
                    width: containerRef.current.clientWidth,
                    height: 64
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

    if (data.length === 0) {
        return <div className="h-full flex items-center justify-center text-[10px] text-slate-300 dark:text-slate-700 font-medium italic">Aucune donnée</div>
    }

    return (
        <div ref={containerRef} className="w-full h-16 overflow-hidden flex items-center justify-end">
            <UplotReact
                options={options}
                data={chartData}
                onCreate={(chart) => {
                    chartRef.current = chart
                }}
            />
        </div>
    )
}
