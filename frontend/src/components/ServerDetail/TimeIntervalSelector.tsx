import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimeIntervalSelectorProps {
    selectedRange: number
    setSelectedRange: (v: number) => void
    selectedInterval: number
    setSelectedInterval: (v: number) => void
    timeRanges: Array<{ value: number; label: string }>
    intervals: Array<{ value: number; label: string }>
    containerClassName?: string
    triggerClassName?: string
}

export function TimeIntervalSelector({
    selectedRange,
    setSelectedRange,
    selectedInterval,
    setSelectedInterval,
    timeRanges,
    intervals,
    containerClassName,
    triggerClassName
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
                </SelectContent>
            </Select>
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
