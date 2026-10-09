import { useMemo } from 'react';
import uPlot from 'uplot';

/**
 * Keeps the uPlot legend clickable (hide/isolate a series) while guaranteeing
 * at least one visible series: hiding the last one is refused, otherwise the
 * chart would go blank with legend/tooltip still showing values.
 */
export function useEnsureOneSeriesVisiblePlugin() {
    return useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                setSeries: (u: uPlot, seriesIdx: number | null, opts: { show?: boolean }) => {
                    if (seriesIdx == null || seriesIdx <= 0 || opts?.show !== false) return;
                    const anyVisible = u.series.some((s, i) => i > 0 && s.show);
                    if (!anyVisible) {
                        u.setSeries(seriesIdx, { show: true }, false);
                    }
                },
            },
        };
    }, []);
}
