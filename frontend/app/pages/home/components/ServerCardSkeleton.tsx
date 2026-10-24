import { MiniChartSkeleton } from "./MiniChartSkeleton"

export function ServerCardSkeleton() {
    return (
        <div className="relative @container flex h-full w-full animate-pulse flex-col justify-between gap-2 rounded-2xl border border-border/80 bg-card/95 p-3 shadow-sm backdrop-blur-sm min-h-[185px] sm:p-5">
            {/* Top row */}
            <div className="flex flex-row gap-2 w-full min-w-0 items-start sm:gap-4">
                {/* Favicon Skeleton */}
                <div className="relative flex-shrink-0">
                    <div className="h-9 w-9 rounded-lg bg-muted/60 sm:h-12 sm:w-12 sm:rounded-xl" />
                </div>

                {/* Name & IP Skeleton */}
                <div className="flex flex-col flex-grow min-w-0 gap-2 justify-center pt-1">
                    <div className="h-4 w-3/4 bg-muted/60 rounded-md" />
                    <div className="h-3 w-1/2 bg-muted/60 rounded-md mt-1" />
                </div>

                {/* Status/Player Skeleton */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5 pt-1">
                    <div className="h-3 w-8 bg-muted/60 rounded-full" />
                    <div className="h-2 w-12 bg-muted/60 rounded-full" />
                </div>
            </div>

            {/* Chart Skeleton */}
            <div className="w-full h-12 my-2 overflow-hidden flex items-center justify-end">
                <MiniChartSkeleton />
            </div>

            {/* Bottom row Skeleton */}
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-2 border-t border-border/30">
                <div className="flex flex-row items-center gap-1.5 min-w-0">
                    <div className="h-4 w-12 bg-muted/50 rounded-lg shrink-0" />
                    <div className="h-4 w-16 bg-muted/50 rounded-lg hidden @min-[11rem]:block" />
                </div>
                <div className="h-3 w-16 bg-muted/50 rounded-lg shrink-0" />
            </div>
        </div>
    )
}
