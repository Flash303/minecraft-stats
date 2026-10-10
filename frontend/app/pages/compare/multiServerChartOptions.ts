import uPlot from "uplot"
import { formatAxisTick, formatTooltipDateTime } from "@/core/lib/chartUtils"
import { formatNumber } from "@/core/lib/utils"
import { resolveToken, withAlpha } from "@/core/lib/theme-colors"
import { makeXScaleRange } from "@/core/hooks/charts"

export interface MultiServerChartPlugins {
    tooltip: uPlot.Plugin
    touchInteract: uPlot.Plugin
    legendGuard: uPlot.Plugin
    zoom: uPlot.Plugin
}

export interface BuildMultiServerChartOptionsInput {
    serverNames: string[]
    seriesColors: string[]
    timeRange: { from: number; to: number }
    language: string
    t: (key: string) => string
    plugins: MultiServerChartPlugins
}

/** Pure uPlot options builder: series, scales, axes and cursor for N servers. */
export function buildMultiServerChartOptions({
    serverNames,
    seriesColors,
    timeRange,
    language,
    t,
    plugins,
}: BuildMultiServerChartOptionsInput): uPlot.Options {
    const gridColor = resolveToken("--chart-grid")
    const textColor = resolveToken("--chart-axis-text")
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
        const color = seriesColors[i % seriesColors.length]
        series.push({
            label: serverNames[i],
            stroke: color,
            fill: withAlpha(color, 0.1),
            width: 2,
            spanGaps: false,
            value: (_u: uPlot, val: number) => {
                if (val == null) return ""
                return formatNumber(language, Math.round(val))
            }
        })
    }

    const isDesktop = typeof window !== "undefined" ? window.innerWidth >= 640 : true

    return {
        width: 800,
        height: typeof window !== "undefined" && window.innerWidth < 640 ? 300 : 450,
        plugins: [plugins.tooltip, plugins.touchInteract, plugins.legendGuard, plugins.zoom],
        padding: [20, 15, 10, 10],
        cursor: {
            y: false,
            drag: {
                x: isDesktop,
                y: false,
                setScale: isDesktop
            }
        },
        scales: {
            x: {
                time: true,
                auto: false,
                min: timeRange.from,
                max: timeRange.to,
                range: makeXScaleRange({
                    countNonNullValues: true,
                    getTimeRange: () => timeRange
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
            }
        ],
        series: series
    } as uPlot.Options
}
