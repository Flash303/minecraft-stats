import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Trash2 } from "lucide-react"
import { useAuth } from "@clerk/react"
import { deleteServer } from "@/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

export function BulkDeleteModal({ selectedIds, onSuccess, triggerToast, onClear, t }: { selectedIds: number[], onSuccess: () => void, triggerToast?: (type: "success" | "warning" | "error", text: string) => void, onClear: () => void, t: (key: string, options?: Record<string, string>) => string }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText !== t("admin.servers.confirmText")) return

        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                await Promise.all(selectedIds.map(id => deleteServer(id, token)))
                setOpen(false)
                onSuccess()
                if (triggerToast) {
                    triggerToast("success", t("admin.servers.deleteBulkSuccess", { count: selectedIds.length.toString() }))
                }
                onClear()
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.deleteError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) setConfirmText("")
            setOpen(v)
        }}>
            <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-7 text-xs gap-1">
                    <Trash2 className="h-3 w-3" />
                    {t("admin.servers.deleteBulk", { count: selectedIds.length.toString() })}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.servers.deleteBulkTitle", { count: selectedIds.length.toString() })}</DialogTitle>
                    <DialogDescription dangerouslySetInnerHTML={{ __html: t("admin.servers.deleteBulkDesc", { count: selectedIds.length.toString() }) }} />
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="bulk-confirm" dangerouslySetInnerHTML={{ __html: t("admin.servers.typeConfirmBulk") }} />
                        <Input
                            id="bulk-confirm"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={t("admin.servers.confirmText")}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" variant="destructive" disabled={loading || confirmText !== t("admin.servers.confirmText")}>
                            {loading ? t("admin.servers.deleting") : t("admin.servers.delete")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}