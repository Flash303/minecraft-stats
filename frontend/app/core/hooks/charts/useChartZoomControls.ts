import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import uPlot from 'uplot';

export interface ChartZoomControlsOptions {
    chartRef: React.MutableRefObject<uPlot | null>;
    /** Full data time window; zoom reference and reset target. */
    timeRange?: { from: number; to: number };
    /** Changing this value forces a zoom reset (e.g. selected range changed). */
    zoomResetId?: string;
    onZoomChange?: (isZoomed: boolean) => void;
    /** Reports the visible window (used for stats over the selection). */
    onVisibleRangeChange?: (min: number, max: number) => void;
}

/** Zoom tracking, reset button support and auto-resets shared by every chart. */
export function useChartZoomControls({
    chartRef,
    timeRange,
    zoomResetId,
    onZoomChange,
    onVisibleRangeChange,
}: ChartZoomControlsOptions) {
    const [isZoomed, setIsZoomed] = useState(false);
    const timeRangeRef = useRef(timeRange);
    // eslint-disable-next-line react-hooks/refs
    timeRangeRef.current = timeRange;

    const scaleHookPlugin = useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                ...(onVisibleRangeChange
                    ? {
                          setSelect: (u: uPlot) => {
                              if (u.scales.x.min != null && u.scales.x.max != null) {
                                  onVisibleRangeChange(u.scales.x.min, u.scales.x.max);
                              }
                          },
                      }
                    : {}),
                setScale: (u: uPlot, key: string) => {
                    if (key !== 'x' || u.scales.x.min == null || u.scales.x.max == null) return;
                    onVisibleRangeChange?.(u.scales.x.min, u.scales.x.max);
                    const tr = timeRangeRef.current;
                    if (tr == null) {
                        setIsZoomed(false);
                        return;
                    }
                    setIsZoomed(Math.abs(u.scales.x.min - tr.from) > 1 || Math.abs(u.scales.x.max - tr.to) > 1);
                },
            },
        };
    }, [onVisibleRangeChange]);

    const resetZoom = useCallback(() => {
        const chart = chartRef.current;
        const tr = timeRangeRef.current;
        if (!chart || !tr) return;
        chart.setScale('x', { min: tr.from, max: tr.to });
        chart.setScale('y', {
            min: undefined as unknown as number,
            max: undefined as unknown as number,
        });
    }, [chartRef]);

    useEffect(() => {
        onZoomChange?.(isZoomed);
    }, [isZoomed, onZoomChange]);

    const from = timeRange?.from;
    const to = timeRange?.to;

    useEffect(() => {
        if (from == null || to == null) return;
        if (chartRef.current && !isZoomed) {
            chartRef.current.setScale('x', { min: from, max: to });
        }
    }, [from, to, isZoomed, chartRef]);

    useEffect(() => {
        if (zoomResetId == null || from == null || to == null) return;
        chartRef.current?.setScale('x', { min: from, max: to });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomResetId]);

    return { isZoomed, scaleHookPlugin, resetZoom };
}
