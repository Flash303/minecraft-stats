/**
 * Single source of truth for colors outside the Tailwind utility system:
 * canvas rendering (uPlot, Hero3D) and third-party brand colors.
 *
 * Canvas contexts cannot read Tailwind classes, so resolveToken() reads the
 * CSS variables from computed document styles at call time (theme-aware,
 * works after light/dark switches as long as it is called during render /
 * options rebuild).
 */

const FALLBACKS: Record<string, { light: string; dark: string }> = {
  "--primary": { light: "#4f46e5", dark: "#6366f1" },
  "--info": { light: "#2563eb", dark: "#3b82f6" },
  "--success": { light: "#059669", dark: "#10b981" },
  "--warning": { light: "#d97706", dark: "#fbbf24" },
  "--destructive": { light: "#dc2626", dark: "#ef4444" },
  "--border": { light: "#d4d4d8", dark: "#27272a" },
  "--card": { light: "#ffffff", dark: "#18181b" },
  "--muted-foreground": { light: "#52525b", dark: "#a1a1aa" },
  "--foreground": { light: "#09090b", dark: "#fafafa" },
  "--chart-1": { light: "#e11d48", dark: "#6366f1" },
  "--chart-2": { light: "#3b82f6", dark: "#10b981" },
  "--chart-3": { light: "#22c55e", dark: "#eab308" },
  "--chart-4": { light: "#f59e0b", dark: "#a855f7" },
  "--chart-5": { light: "#6366f1", dark: "#f97316" },
  "--chart-grid": { light: "#e5e7eb", dark: "#374151" },
  "--chart-axis-text": { light: "#374151", dark: "#d1d5db" },
};

export function isDarkTheme(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

/** Resolves a design token (--info, --chart-1...) to its current color value. */
export function resolveToken(token: string): string {
  const fallback = FALLBACKS[token];
  const fb = fallback ? (isDarkTheme() ? fallback.dark : fallback.light) : "#888888";
  if (typeof window === "undefined") return fb;
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value || fb;
}

/** Converts a resolved #rrggbb color to rgba() with the given alpha. */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.replace("#", "");
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Series palette for multi-series charts, cycling through chart tokens. */
export function chartPalette(count: number): string[] {
  return Array.from({ length: count }, (_, i) => resolveToken(`--chart-${(i % 5) + 1}`));
}

/**
 * Third-party brand colors (deliberately NOT theme tokens: they must match
 * the external brands, not our design system).
 */
export const BRAND_COLORS = {
  lunarPartnered: "text-orange-500",
  lunarDefault: "text-sky-500",
  labyPartnered: "text-cyan-500",
} as const;

/** Reusable class pair for the Lunar Client logo across cards/detail/search. */
export function lunarLogoClass(partnered: boolean | undefined): string {
  return partnered ? BRAND_COLORS.lunarPartnered : BRAND_COLORS.lunarDefault;
}

/** Reusable class pair for the LabyMod logo across cards/search/tags. */
export function labyLogoClass(partnered: boolean | undefined): string {
  return partnered ? BRAND_COLORS.labyPartnered : "text-foreground";
}
