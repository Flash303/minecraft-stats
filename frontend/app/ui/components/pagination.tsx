import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/ui/components/button"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"

export interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    className?: string
    showPageText?: boolean
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    className,
    showPageText = true
}: PaginationProps) {
    const { t } = useLanguage()

    if (totalPages <= 1) return null

    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

    const prevText = t("common.pagination.previous") !== "common.pagination.previous"
        ? t("common.pagination.previous")
        : t("serverList.pagination.previous")

    const nextText = t("common.pagination.next") !== "common.pagination.next"
        ? t("common.pagination.next")
        : t("serverList.pagination.next")

    const pageText = t("common.pagination.page", {
        current: safeCurrentPage.toString(),
        total: totalPages.toString()
    }) !== "common.pagination.page"
        ? t("common.pagination.page", {
              current: safeCurrentPage.toString(),
              total: totalPages.toString()
          })
        : t("serverList.pagination.page", {
              current: safeCurrentPage.toString(),
              total: totalPages.toString()
          })

    return (
        <div className={cn("flex items-center justify-center gap-3 sm:gap-4 mt-8 mb-4", className)}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                aria-label={prevText}
                className="rounded-xl h-10 px-3 sm:px-4 flex items-center gap-2 border-slate-200/80 dark:border-zinc-800 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{prevText}</span>
            </Button>

            {showPageText && (
                <div className="text-sm font-medium text-muted-foreground px-1 select-none">
                    {pageText}
                </div>
            )}

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                aria-label={nextText}
                className="rounded-xl h-10 px-3 sm:px-4 flex items-center gap-2 border-slate-200/80 dark:border-zinc-800 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
                <span className="hidden sm:inline">{nextText}</span>
                <ChevronRight className="w-4 h-4" />
            </Button>
        </div>
    )
}
