
export function ServerCardSkeleton() {
    return (
        <div className="relative flex flex-col justify-between shadow-sm border border-slate-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-sm p-5 w-full rounded-2xl h-[185px] animate-pulse">
            {/* Top row */}
            <div className="flex flex-row gap-4 w-full min-w-0 items-start">
                {/* Favicon Skeleton */}
                <div className="relative flex-shrink-0">
                    <div className="h-12 w-12 rounded-xl bg-slate-200/60 dark:bg-zinc-800/80" />
                </div>

                {/* Name & IP Skeleton */}
                <div className="flex flex-col flex-grow min-w-0 gap-2 justify-center pt-1">
                    <div className="h-4 w-3/4 bg-slate-200/60 dark:bg-zinc-800/80 rounded-md" />
                    <div className="h-3 w-1/2 bg-slate-200/60 dark:bg-zinc-800/80 rounded-md mt-1" />
                </div>

                {/* Status/Player Skeleton */}
                <div className="flex-shrink-0 flex flex-col items-end gap-1.5 pt-1">
                    <div className="h-3 w-8 bg-slate-200/60 dark:bg-zinc-800/80 rounded-full" />
                    <div className="h-2 w-12 bg-slate-200/60 dark:bg-zinc-800/80 rounded-full" />
                </div>
            </div>

            {/* Chart Skeleton */}
            <div className="w-full h-12 my-2 flex items-center justify-center">
                <div className="w-full h-full bg-slate-100/50 dark:bg-zinc-800/40 rounded-lg" />
            </div>

            {/* Bottom row Skeleton */}
            <div className="flex flex-row items-center justify-between gap-2 w-full pt-2 border-t border-slate-100/50 dark:border-zinc-800/30">
                <div className="flex flex-row items-center gap-1.5">
                    <div className="h-4 w-12 bg-slate-200/50 dark:bg-zinc-800/50 rounded-lg" />
                    <div className="h-4 w-16 bg-slate-200/50 dark:bg-zinc-800/50 rounded-lg" />
                </div>
                <div className="h-3 w-16 bg-slate-200/50 dark:bg-zinc-800/50 rounded-lg" />
            </div>
        </div>
    )
}
