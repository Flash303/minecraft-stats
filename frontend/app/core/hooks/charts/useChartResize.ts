import { useEffect } from 'react';
import uPlot from 'uplot';

const HEIGHT_MOBILE = 300;
const HEIGHT_DESKTOP = 450;
const CONTAINER_PADDING = 32;

/** Fits a chart to its container width (responsive height on mobile). */
export function sizeChartToContainer(chart: uPlot, container: HTMLElement | null) {
    if (!container) return;
    chart.setSize({
        width: container.clientWidth - CONTAINER_PADDING,
        height: window.innerWidth < 640 ? HEIGHT_MOBILE : HEIGHT_DESKTOP,
    });
}

export function useChartResize(
    chartRef: React.MutableRefObject<uPlot | null>,
    containerRef: React.MutableRefObject<HTMLDivElement | null>,
    dataDeps: unknown[],
) {
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                sizeChartToContainer(chartRef.current, containerRef.current);
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        handleResize();

        return () => {
            resizeObserver.disconnect();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, dataDeps);
}
