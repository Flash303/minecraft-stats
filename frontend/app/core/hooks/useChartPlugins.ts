import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import uPlot from 'uplot';
import { formatTooltipDateTime } from '@/core/lib/chartUtils';

const CHART_HEIGHT_MOBILE = 300;
const CHART_HEIGHT_DESKTOP = 450;
// p-4 = 16px * 2 de padding du conteneur
const CHART_CONTAINER_PADDING = 32;

/** Ajuste la taille d'un graphe à la largeur de son conteneur (hauteur responsive mobile). */
export function sizeChartToContainer(chart: uPlot, container: HTMLElement | null) {
    if (!container) return;
    chart.setSize({
        width: container.clientWidth - CHART_CONTAINER_PADDING,
        height: window.innerWidth < 640 ? CHART_HEIGHT_MOBILE : CHART_HEIGHT_DESKTOP,
    });
}

export function useChartResize(chartRef: React.MutableRefObject<uPlot | null>, containerRef: React.MutableRefObject<HTMLDivElement | null>, dataDeps: unknown[]) {
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

/**
 * Fabrique la fonction `range` de l'échelle X partagée par tous les graphes :
 * évite le zoom sur une plage quasi vide en revenant à la vue courante.
 * - `countNonNullValues` : ne compter que les points dont la valeur Y est non nulle (gaps offline)
 * - `getTimeRange` : plage temporelle de repli quand la vue courante est déjà la plage demandée
 */
export function makeXScaleRange(opts: {
    countNonNullValues?: boolean;
    getTimeRange?: () => { from: number; to: number } | undefined;
} = {}) {
    return (u: uPlot, min: number, max: number): [number, number] => {
        const xData = u.data[0];
        if (!xData || xData.length === 0) return [min, max];

        let pointsCount = 0;
        for (let i = 0; i < xData.length; i++) {
            const x = xData[i];
            if (x >= min && x <= max) {
                if (!opts.countNonNullValues || u.data[1]?.[i] !== null) {
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

interface ChartZoomControlsOptions {
    chartRef: React.MutableRefObject<uPlot | null>;
    /** Plage temporelle "pleine" des données ; sert de référence de zoom et de cible de reset */
    timeRange?: { from: number; to: number };
    /** Changer cette valeur force un reset du zoom (ex: changement de plage sélectionnée) */
    zoomResetId?: string;
    onZoomChange?: (isZoomed: boolean) => void;
    /** Notifie la plage visible (utilisé pour les stats sur la sélection) */
    onVisibleRangeChange?: (min: number, max: number) => void;
}

/**
 * Logique de zoom mutualisée entre PlayerChart et MultiServerChart :
 * plugin de suivi du zoom, bouton reset, resets automatiques et propagation d'état.
 */
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
                    setIsZoomed(Math.abs(u.scales.x.min - tr.from) > 1 || Math.abs(u.scales.x.max - tr.to) > 1);
                },
            },
        };
    }, [onVisibleRangeChange]);

    const resetZoom = useCallback(() => {
        const chart = chartRef.current;
        if (!chart) return;
        const tr = timeRangeRef.current;
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

    // Suit la plage temporelle tant que l'utilisateur n'a pas zoomé
    useEffect(() => {
        if (from == null || to == null) return;
        if (chartRef.current && !isZoomed) {
            chartRef.current.setScale('x', { min: from, max: to });
        }
    }, [from, to, isZoomed, chartRef]);

    // Reset forcé quand l'id de reset change (même si zoomé)
    useEffect(() => {
        if (zoomResetId == null || from == null || to == null) return;
        chartRef.current?.setScale('x', { min: from, max: to });
        // Reset intentionnel : uniquement déclenché par le changement d'identifiant
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoomResetId]);

    return { isZoomed, scaleHookPlugin, resetZoom };
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
    deps?: unknown[];
}

export function useTooltipPlugin({ language, t, renderRowsHtml, tooltipWidth = 160, deps = [] }: TooltipPluginOptions) {
    const tooltipRef = useRef<HTMLDivElement | null>(null);

    return useMemo<uPlot.Plugin>(() => {
        let overlay: HTMLDivElement | null = null;
        let lastRenderedIdx: number | null = null;
        let pendingFrame = 0;
        let latestU: uPlot | null = null;

        const hideOverlay = () => {
            lastRenderedIdx = null;
            if (overlay && overlay.style.display !== "none") overlay.style.display = "none";
        };

        // Traitement coalescé à une frame d'affichage : les événements curseur
        // peuvent arriver à plusieurs centaines de Hz ; sans cela, chaque appel
        // provoquerait des reflows (lectures de layout) synchrones.
        const applyCursor = () => {
            pendingFrame = 0;
            const u = latestU;
            if (!u || !overlay) return;

            const idx = u.cursor.idx;
            if (idx == null || idx < 0) return hideOverlay();

            const xVal = u.data[0]?.[idx];
            if (xVal == null) return hideOverlay();

            // Perf : reconstruit le HTML seulement quand le point survolé change ;
            // les micro-mouvements dans le même point ne font que replacer l'infobulle.
            if (lastRenderedIdx !== idx) {
                const locale = language === "fr" ? "fr-FR" : "en-US";
                const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"));

                const rowsHtml = renderRowsHtml(u, idx, locale);
                if (!rowsHtml) return hideOverlay();

                overlay.innerHTML = `
                    <div class="border-b border-white/10 pb-1.5 mb-1.5 text-zinc-400 font-semibold flex items-center gap-1.5">📅 ${dateTimeStr}</div>
                    <div class="space-y-1">${rowsHtml}</div>
                `;
                lastRenderedIdx = idx;
            }

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
        };

        return {
            hooks: {
                init: (u: uPlot) => {
                    const el = document.createElement("div");
                    el.className = `pointer-events-none absolute z-50 rounded-xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-2.5 text-xs text-white shadow-2xl backdrop-blur-md font-sans leading-relaxed min-w-[${tooltipWidth}px] transition-opacity duration-150`;
                    el.style.display = "none";
                    el.style.position = "fixed";
                    u.over.appendChild(el);
                    overlay = el;
                    tooltipRef.current = el;
                },
                // Nouvelles données -> le contenu doit être reconstruit au prochain survol
                setData: () => {
                    lastRenderedIdx = null;
                },
                setCursor: (u: uPlot) => {
                    latestU = u;
                    if (!pendingFrame) {
                        pendingFrame = requestAnimationFrame(applyCursor);
                    }
                },
                destroy: () => {
                    if (pendingFrame) {
                        cancelAnimationFrame(pendingFrame);
                        pendingFrame = 0;
                    }
                    latestU = null;
                    lastRenderedIdx = null;
                    overlay?.remove();
                    overlay = null;
                    tooltipRef.current = null;
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo
    }, [language, t, ...deps]);
}
