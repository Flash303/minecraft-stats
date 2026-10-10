import { useMemo, useRef } from 'react';
import uPlot from 'uplot';
import { formatTooltipDateTime } from '@/core/lib/chartUtils';

export interface TooltipPluginOptions {
    language: string;
    t: (key: string) => string;
    renderRowsHtml: (u: uPlot, idx: number) => string;
    tooltipWidth?: number;
    deps?: unknown[];
}

/** Custom HTML tooltip following the cursor (coalesced to one frame per paint). */
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

        const applyCursor = () => {
            pendingFrame = 0;
            const u = latestU;
            if (!u || !overlay) return;

            const idx = u.cursor.idx;
            if (idx == null || idx < 0) return hideOverlay();

            const xVal = u.data[0]?.[idx];
            if (xVal == null) return hideOverlay();

            if (lastRenderedIdx !== idx) {
                const locale = language === "fr" ? "fr-FR" : "en-US";
                const dateTimeStr = formatTooltipDateTime(xVal, language, locale, t("common.time"));

                const rowsHtml = renderRowsHtml(u, idx);
                if (!rowsHtml) return hideOverlay();

                overlay.innerHTML = `
                    <div class="border-b border-border/60 pb-1.5 mb-1.5 text-muted-foreground font-semibold flex items-center gap-1.5">📅 ${dateTimeStr}</div>
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
                    el.className = `pointer-events-none absolute z-50 rounded-xl border border-border bg-popover/90 px-3.5 py-2.5 text-xs text-popover-foreground shadow-2xl backdrop-blur-md font-sans leading-relaxed min-w-[${tooltipWidth}px] transition-opacity duration-150`;
                    el.style.display = "none";
                    el.style.position = "fixed";
                    u.over.appendChild(el);
                    overlay = el;
                    tooltipRef.current = el;
                },
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
