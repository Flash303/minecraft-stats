import { useMemo, useEffect, useRef } from 'react';
import uPlot from 'uplot';
import { formatTooltipDateTime } from '@/core/lib/chartUtils';

export function useChartResize(chartRef: React.MutableRefObject<uPlot | null>, containerRef: React.MutableRefObject<HTMLDivElement | null>, dataDeps: any[]) {
    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current && containerRef.current) {
                const height = window.innerWidth < 640 ? 300 : 450;
                chartRef.current.setSize({
                    width: containerRef.current.clientWidth - 32, // account for padding (p-4 = 16px*2)
                    height: height
                });
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

interface TooltipPluginOptions {
    language: string;
    t: (key: string) => string;
    renderRowsHtml: (u: uPlot, idx: number, locale: string) => string;
    tooltipWidth?: number;
    deps?: any[];
}

export function useTooltipPlugin({ language, t, renderRowsHtml, tooltipWidth = 160, deps = [] }: TooltipPluginOptions) {
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    return useMemo<uPlot.Plugin>(() => {
        return {
            hooks: {
                init: (u: uPlot) => {
                    const overlay = document.createElement("div");
                    overlay.className = `pointer-events-none absolute z-50 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md font-sans leading-relaxed min-w-[${tooltipWidth}px] transition-opacity duration-150`;
                    overlay.style.display = "none";
                    overlay.style.position = "fixed";
                    u.over.appendChild(overlay);
                    tooltipRef.current = overlay;
                },
                setCursor: (u: uPlot) => {
                    const overlay = tooltipRef.current;
                    if (!overlay) return;

                    const idx = u.cursor.idx;
                    if (idx == null || idx < 0) {
                        overlay.style.display = "none";
                        return;
                    }

                    const xVal = u.data[0][idx];
                    if (xVal == null) {
                        overlay.style.display = "none";
                        return;
                    }

                    const locale = language === "fr" ? "fr-FR" : "en-US";
                    const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"));
                    
                    const rowsHtml = renderRowsHtml(u, idx, locale);
                    if (!rowsHtml) {
                        overlay.style.display = "none";
                        return;
                    }

                    overlay.innerHTML = `
                        <div class="border-b border-white/10 pb-1.5 mb-1.5 text-zinc-400 font-semibold flex items-center gap-1.5">📅 ${dateTimeStr}</div>
                        <div class="space-y-1">${rowsHtml}</div>
                    `;

                    const left = u.cursor.left ?? 0;
                    const top = u.cursor.top ?? 0;
                    const rect = u.over.getBoundingClientRect();

                    let tooltipLeft = rect.left + left + 15;
                    const actualTooltipWidth = overlay.offsetWidth || tooltipWidth;
                    
                    if (tooltipLeft + actualTooltipWidth > window.innerWidth - 10) {
                        tooltipLeft = rect.left + left - actualTooltipWidth - 15;
                    }
                    if (tooltipLeft < 10) {
                        tooltipLeft = 10;
                    }

                    overlay.style.left = `${tooltipLeft}px`;
                    overlay.style.top = `${rect.top + top - 15}px`;
                    overlay.style.display = "block";
                },
                destroy: () => {
                    tooltipRef.current?.remove();
                    tooltipRef.current = null;
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, t, ...deps]);
}
