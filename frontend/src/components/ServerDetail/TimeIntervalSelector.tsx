import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"

export type DateRange = {
    from: Date | undefined;
    to?: Date | undefined;
};
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TimeIntervalSelectorProps {
    selectedRange: number
    setSelectedRange: (v: number) => void
    selectedInterval: number
    setSelectedInterval: (v: number) => void
    customRange: DateRange | undefined
    setCustomRange: (v: DateRange | undefined) => void
    timeRanges: Array<{ value: number; label: string }>
    intervals: Array<{ value: number; label: string }>
    containerClassName?: string
    triggerClassName?: string
    t: (key: string) => string
}

export function TimeIntervalSelector({
    selectedRange,
    setSelectedRange,
    selectedInterval,
    setSelectedInterval,
    customRange,
    setCustomRange,
    timeRanges,
    intervals,
    containerClassName,
    triggerClassName,
    t
}: TimeIntervalSelectorProps) {
    return (
        <div className={cn("flex flex-row items-center gap-2", containerClassName)}>
            <Select
                value={String(selectedRange)}
                onValueChange={(v: string) => setSelectedRange(Number(v))}
            >
                <SelectTrigger className={cn("h-9 w-full md:w-[160px] text-xs", triggerClassName)}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {timeRanges.map((r) => (
                        <SelectItem
                            key={r.value}
                            value={String(r.value)}
                            className="text-xs"
                        >
                            {r.label}
                        </SelectItem>
                    ))}
                    <SelectItem value="-1" className="text-xs">
                        {t("serverDetail.custom")}
                    </SelectItem>
                </SelectContent>
            </Select>
            {selectedRange === -1 && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                                "h-9 w-full md:w-[240px] justify-start text-left font-normal text-xs bg-transparent",
                                !customRange && "text-muted-foreground",
                                triggerClassName
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customRange?.from ? (
                                customRange.to ? (
                                    <>
                                        {format(customRange.from, "dd/MM/yyyy")} -{" "}
                                        {format(customRange.to, "dd/MM/yyyy")}
                                    </>
                                ) : (
                                    format(customRange.from, "dd/MM/yyyy")
                                )
                            ) : (
                                <span>{t("serverDetail.custom")}</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            mode="range"
                            defaultMonth={customRange?.from}
                            selected={customRange}
                            onSelect={setCustomRange}
                            numberOfMonths={2}
                            disabled={(date) => date > new Date()}
                        />
                    </PopoverContent>
                </Popover>
            )}
            <Select
                value={String(selectedInterval)}
                onValueChange={(v: string) => setSelectedInterval(Number(v))}
            >
                <SelectTrigger className={cn("h-9 w-full md:w-[100px] text-xs", triggerClassName)}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {intervals.map((i) => (
                        <SelectItem
                            key={i.value}
                            value={String(i.value)}
                            className="text-xs"
                        >
                            {i.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    )
}
