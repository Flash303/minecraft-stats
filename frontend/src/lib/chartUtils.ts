import type uPlot from "uplot"
import type { Server } from "./api"

interface PlayerDataPoint {
    date: number
    value: number
}

const MAX_GAP_SECONDS = 30 * 60
const GAP_MULTIPLIER = 2

/**
 * Transforms records for a single server into uPlot.AlignedData.
 * Injects NULL values to represent gaps in data.
 */
export function prepareSingleChartData(data: PlayerDataPoint[], intervalMs?: number): uPlot.AlignedData {
    if (!data || data.length === 0) return [[], []]

    const sorted = [...data].sort((a, b) => a.date - b.date)

    const timestamps: number[] = []
    const values: (number | null)[] = []

    const gapThreshold = intervalMs ? (intervalMs / 1000) * GAP_MULTIPLIER : MAX_GAP_SECONDS

    for (let i = 0; i < sorted.length; i++) {
        const currentPoint = sorted[i]
        const currentX = currentPoint.date > 1000000000000 ? currentPoint.date / 1000 : currentPoint.date

        if (timestamps.length > 0) {
            const prevX = timestamps[timestamps.length - 1]
            const diff = currentX - prevX

            if (diff > gapThreshold) {
                timestamps.push(prevX + 1)
                values.push(null)
            }
        }

        timestamps.push(currentX)
        values.push(currentPoint.value)
    }

    return [timestamps, values]
}

/**
 * Transforms records for multiple servers into aligned uPlot.AlignedData.
 * Injects NULL values to represent gaps in data and aligns timestamps.
 */
export function prepareMultiChartData(
    selectedServers: Server[],
    recordsMap: { [serverId: number]: PlayerDataPoint[] },
    intervalMs?: number
): uPlot.AlignedData {
    if (selectedServers.length === 0) return [[], []]

    const gapThreshold = intervalMs ? (intervalMs / 1000) * GAP_MULTIPLIER : MAX_GAP_SECONDS

    // Collect all unique timestamps
    const allTimestampsSet = new Set<number>()
    selectedServers.forEach(s => {
        const records = recordsMap[s.id] || []
        const sortedRecords = [...records].sort((a, b) => a.date - b.date)
        
        for (let i = 0; i < sortedRecords.length; i++) {
            const r = sortedRecords[i]
            const t = r.date > 1000000000000 ? Math.floor(r.date / 1000) : r.date
            
            if (i > 0) {
                const prevR = sortedRecords[i - 1]
                const prevT = prevR.date > 1000000000000 ? Math.floor(prevR.date / 1000) : prevR.date
                if (t - prevT > gapThreshold) {
                    allTimestampsSet.add(prevT + 1)
                }
            }
            allTimestampsSet.add(t)
        }
    })

    const sortedTimestamps = Array.from(allTimestampsSet).sort((a, b) => a - b)
    const result: uPlot.AlignedData = [sortedTimestamps]

    selectedServers.forEach(s => {
        const records = recordsMap[s.id] || []
        const values: (number | null)[] = new Array(sortedTimestamps.length).fill(null)
        
        // Map records to timestamps
        records.forEach(r => {
            const t = r.date > 1000000000000 ? Math.floor(r.date / 1000) : r.date
            const idx = sortedTimestamps.indexOf(t)
            if (idx !== -1) values[idx] = r.value
        })

        result.push(values)
    })

    return result
}

/**
 * Formats a timestamp value for uPlot axis ticks.
 */
export function formatAxisTick(v: number | null, language: string, locale: string): string {
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
}

/**
 * Formats a timestamp value for uPlot tooltips.
 */
export function formatTooltipDateTime(val: number, language: string, locale: string, timeWord: string): string {
    const d = new Date(val * 1000)
    const dateStr = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" })
    const timeStr = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit", hour12: language !== "fr" })
    return `${dateStr} ${timeWord} ${timeStr}`
}

/**
 * Returns available time ranges options.
 */
export function getTimeRanges(t: (key: string) => string) {
    return [
        { label: t("serverDetail.lastHour"), value: 3600000 },
        { label: t("serverDetail.last6Hours"), value: 21600000 },
        { label: t("serverDetail.last24Hours"), value: 86400000 },
        { label: t("serverDetail.last7Days"), value: 604800000 },
        { label: t("serverDetail.last30Days"), value: 2592000000 }
    ]
}

/**
 * Returns available data intervals options.
 */
export function getIntervals(t: (key: string) => string) {
    return [
        { label: t("serverDetail.interval10s"), value: 10000 },
        { label: t("serverDetail.interval1m"), value: 60000 },
        { label: t("serverDetail.interval5m"), value: 300000 },
        { label: t("serverDetail.interval30m"), value: 1800000 },
        { label: t("serverDetail.interval1h"), value: 3600000 }
    ]
}
