import { ChevronLeft, ChevronRight } from "lucide-react"
import { Link } from "react-router"
import { Button } from "@/ui/components/button"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { cn } from "@/core/lib/utils"

export interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange?: (page: number) => void
    buildPageHref?: (page: number) => string
    className?: string
    showPageText?: boolean
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    buildPageHref,
    className,
    showPageText = true
}: PaginationProps) {
    const { t } = useLanguage()

    if (totalPages <= 1) return null

    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages)

    const prevText = t("common.pagination.previous")
    const nextText = t("common.pagination.next")
    const pageText = t("common.pagination.page", {
        current: safeCurrentPage.toString(),
        total: totalPages.toString()
    })

    const buttonClassName =
        "rounded-xl h-10 px-3 sm:px-4 flex items-center gap-2 border-border/80 shadow-xs cursor-pointer disabled:cursor-not-allowed"

    const renderNavButton = (
        page: number,
        disabled: boolean,
        ariaLabel: string,
        content: React.ReactNode
    ) => {
        if (!disabled && buildPageHref) {
            return (
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    aria-label={ariaLabel}
                    className={buttonClassName}
                >
                    <Link to={buildPageHref(page)} replace preventScrollReset>
                        {content}
                    </Link>
                </Button>
            )
        }
        return (
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange?.(page)}
                disabled={disabled}
                aria-label={ariaLabel}
                className={buttonClassName}
            >
                {content}
            </Button>
        )
    }

    return (
        <div className={cn("flex items-center justify-center gap-3 sm:gap-4 mt-8 mb-4", className)}>
            {renderNavButton(
                safeCurrentPage - 1,
                safeCurrentPage <= 1,
                prevText,
                <>
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">{prevText}</span>
                </>
            )}

            {showPageText && (
                <div className="text-sm font-medium text-muted-foreground px-1 select-none">
                    {pageText}
                </div>
            )}

            {renderNavButton(
                safeCurrentPage + 1,
                safeCurrentPage >= totalPages,
                nextText,
                <>
                    <span className="hidden sm:inline">{nextText}</span>
                    <ChevronRight className="w-4 h-4" />
                </>
            )}
        </div>
    )
}
