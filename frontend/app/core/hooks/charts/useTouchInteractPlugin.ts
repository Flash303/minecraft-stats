import { useMemo } from 'react';
import uPlot from 'uplot';

/** One-finger cursor + two-finger pinch zoom on touch devices. */
export function useTouchInteractPlugin() {
    return useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                ready: (u: uPlot) => {
                    const over = u.over;
                    over.style.touchAction = "pan-y";

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
                    };

                    const handleTouchMove = (e: TouchEvent) => {
                        if (e.touches.length === 1) {
                            rect = over.getBoundingClientRect();
                            u.setCursor({
                                left: e.touches[0].clientX - rect.left,
                                top: e.touches[0].clientY - rect.top
                            });
                        } else if (e.touches.length === 2) {
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
                    };

                    over.addEventListener("touchstart", handleTouchStart, { passive: false });
                    over.addEventListener("touchmove", handleTouchMove, { passive: false });
                }
            }
        };
    }, []);
}
