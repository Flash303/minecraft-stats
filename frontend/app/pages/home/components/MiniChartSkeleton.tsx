export function MiniChartSkeleton() {
    return (
        <div className="h-full w-full flex items-end overflow-hidden pb-1 animate-pulse">
            {Array.from({ length: 40 }).map((_, i) => {
                // Static pseudo-random heights to avoid hydration mismatches
                // Using a simple sine wave + pseudo-random pattern
                const seed = i * 13.37;
                const wave = Math.sin(seed) * 20;
                const random = (seed * 93.01 % 100) / 100;
                const height = 30 + wave + random * 30; // 10 to 80%

                return (
                    <div
                        key={i}
                        className="flex-1 bg-muted/40 rounded-t-[1px] mx-[1px]"
                        style={{ height: `${height}%`, opacity: (i / 40) * 0.5 + 0.3 }}
                    />
                )
            })}
        </div>
    )
}
