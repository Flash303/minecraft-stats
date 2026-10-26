import { useMemo, useState } from "react"
import { Download, Loader2 } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useToast } from "@/core/hooks/useToast"
import type { Server } from "@/core/lib/api"
import { downloadServersDat, orderServersForExport } from "@/core/lib/servers-dat"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/components/dialog"
import { Button } from "@/ui/components/button"
import { Label } from "@/ui/components/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/components/select"
import { Checkbox } from "@/ui/components/checkbox"

type ExportSort = "popularity" | "popularityAsc" | "name" | "recent"
type OfflinePlacement = "last" | "first"

/**
 * Opens a configuration modal, then exports the (filtered) server list as a
 * Minecraft Java Edition `servers.dat` file. Place it in your `.minecraft`
 * folder and every server shows up in the multiplayer list.
 */
export function ExportServersDatButton({ servers }: { servers: Server[] }) {
    const { t } = useLanguage()
    const { showToast } = useToast()
    const [open, setOpen] = useState(false)
    const [exporting, setExporting] = useState(false)
    const [sort, setSort] = useState<ExportSort>("popularity")
    const [offlinePlacement, setOfflinePlacement] = useState<OfflinePlacement>("last")
    const [ignoreOffline, setIgnoreOffline] = useState(false)

    // servers.dat is Java Edition only: Bedrock entries are skipped.
    const javaServers = useMemo(
        () => servers.filter((s) => (s.type ?? "java") === "java" && s.ip),
        [servers]
    )
    const bedrockSkipped = useMemo(
        () => servers.filter((s) => (s.type ?? "java") !== "java").length,
        [servers]
    )

    const orderedServers = useMemo(
        () =>
            orderServersForExport(javaServers, {
                sort,
                offlinePlacement,
                ignoreOffline,
            }),
        [javaServers, sort, ignoreOffline, offlinePlacement]
    )

    const handleExport = () => {
        if (exporting) return
        setExporting(true)
        try {
            if (orderedServers.length === 0) {
                showToast("warning", t("serverList.exportEmpty"))
                return
            }
            const count = downloadServersDat(
                orderedServers.map((s) => ({ name: s.name, ip: s.ip, port: s.port }))
            )
            showToast("success", t("serverList.exported", { count: String(count) }))
            setOpen(false)
        } catch (e) {
            console.error("Failed to export servers.dat:", e)
            showToast("error", t("serverList.exportError"))
        } finally {
            setExporting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    title={t("serverList.exportServersDatTitle")}
                    aria-label={t("serverList.exportServersDatTitle")}
                    className={cn(
                        "flex items-center gap-2 px-3.5 py-2 h-10 rounded-xl text-sm font-medium border shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                        "bg-card border-border text-foreground hover:bg-accent active:scale-95"
                    )}
                >
                    <Download aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
                    <span className="hidden xs:inline text-xs font-semibold">
                        {t("serverList.exportServersDat")}
                    </span>
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("serverList.exportTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("serverList.exportDescription")}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="export-sort">{t("serverList.exportSortLabel")}</Label>
                        <Select
                            value={sort}
                            onValueChange={(value: ExportSort) => setSort(value)}
                        >
                            <SelectTrigger id="export-sort">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="popularity">
                                    {t("serverList.exportSortPopularity")}
                                </SelectItem>
                                <SelectItem value="popularityAsc">
                                    {t("serverList.exportSortPopularityAsc")}
                                </SelectItem>
                                <SelectItem value="name">
                                    {t("serverList.exportSortName")}
                                </SelectItem>
                                <SelectItem value="recent">
                                    {t("serverList.exportSortRecent")}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {!ignoreOffline && (
                        <div className="grid gap-2">
                            <Label htmlFor="export-offline">{t("serverList.exportOfflineLabel")}</Label>
                            <Select
                                value={offlinePlacement}
                                onValueChange={(value: OfflinePlacement) => setOfflinePlacement(value)}
                            >
                                <SelectTrigger id="export-offline">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="last">
                                        {t("serverList.exportOfflineLast")}
                                    </SelectItem>
                                    <SelectItem value="first">
                                        {t("serverList.exportOfflineFirst")}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="export-ignore-offline"
                            checked={ignoreOffline}
                            onCheckedChange={(checked) => setIgnoreOffline(checked === true)}
                        />
                        <Label htmlFor="export-ignore-offline" className="cursor-pointer">
                            {t("serverList.exportIgnoreOffline")}
                        </Label>
                    </div>
                    <div className="text-sm text-muted-foreground">
                        <p>
                            {t("serverList.exportPreview", {
                                count: String(orderedServers.length),
                            })}
                        </p>
                        {bedrockSkipped > 0 && (
                            <p className="mt-1 text-xs">
                                {t("serverList.exportBedrockNote", {
                                    skipped: String(bedrockSkipped),
                                })}
                            </p>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        onClick={handleExport}
                        disabled={exporting || orderedServers.length === 0}
                    >
                        {exporting ? (
                            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download aria-hidden="true" className="h-4 w-4" />
                        )}
                        {t("serverList.exportConfirm")} ({orderedServers.length})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
