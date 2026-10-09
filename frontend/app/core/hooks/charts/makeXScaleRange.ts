import uPlot from 'uplot';

export interface XScaleRangeOptions {
    /** Only count x positions backed by at least one non-null y value (offline gaps). */
    countNonNullValues?: boolean;
    /** Requested time window, used as a fallback when the current view holds no data. */
    getTimeRange?: () => { from: number; to: number } | undefined;
}

function hasNonNullAt(u: uPlot, idx: number): boolean {
    for (let s = 1; s < u.data.length; s++) {
        const v = u.data[s]?.[idx];
        if (v !== null && v !== undefined) return true;
    }
    return false;
}

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/**
 * Shared x-scale `range` for every chart: refuses to zoom into an (almost)
 * empty region by falling back to the current view.
 *
 * Safeguard: a non-finite bound (null/NaN) would freeze the scale to
 * `[null, null]` — blank chart, no x ticks, tooltip/legend untouched. This
 * happens when a `setData()` inherits a not-yet-initialized scale (chart
 * recreated on series add: new options + stale data). Fall back to the
 * requested window, then to the current scale.
 */
export function makeXScaleRange(opts: XScaleRangeOptions = {}) {
    return (u: uPlot, min: number, max: number): [number, number] => {
        if (!isFiniteNumber(min) || !isFiniteNumber(max)) {
            const tr = opts.getTimeRange?.();
            if (tr && isFiniteNumber(tr.from) && isFiniteNumber(tr.to) && tr.to > tr.from) {
                min = tr.from;
                max = tr.to;
            } else if (isFiniteNumber(u.scales.x?.min) && isFiniteNumber(u.scales.x?.max)) {
                min = u.scales.x.min as number;
                max = u.scales.x.max as number;
            }
        }

        const xData = u.data[0];
        if (!xData || xData.length === 0) return [min, max];

        let pointsCount = 0;
        for (let i = 0; i < xData.length; i++) {
            const x = xData[i];
            if (x >= min && x <= max) {
                if (!opts.countNonNullValues || hasNonNullAt(u, i)) {
                    pointsCount++;
                }
            }
            if (x > max) break;
        }

        if (pointsCount < 2 && u.scales.x?.min != null && u.scales.x.max != null) {
            if (Math.abs(min - u.scales.x.min) > 1 || Math.abs(max - u.scales.x.max) > 1) {
                return [u.scales.x.min, u.scales.x.max];
            }
            const tr = opts.getTimeRange?.();
            return tr ? [tr.from, tr.to] : [u.scales.x.min, u.scales.x.max];
        }

        return [min, max];
    };
}
