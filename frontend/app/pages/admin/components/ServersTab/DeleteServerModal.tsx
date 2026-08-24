import { useState } from "react"
import type { Server } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { Input } from "@/ui/components/input"
import { Label } from "@/ui/components/label"
import { useAuth } from "@clerk/react"
import { deleteServer } from "@/core/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/components/dialog"

interface DeleteServerModalProps {
    server: Server
    onSuccess: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
    t: (key: string, options?: Record<string, string>) => string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function DeleteServerModal({ server, onSuccess, triggerToast, t, open, onOpenChange }: DeleteServerModalProps) {
    const { getToken } = useAuth()
    const [confirmText, setConfirmText] = useState("")
    const [loading, setLoading] = useState(false)

    const handleOpenChange = (v: boolean) => {
        if (!v) setConfirmText("")
        onOpenChange(v)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText !== t("admin.servers.confirmText")) return

        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const res = await deleteServer(server.id, token)
                if (res.success) {
                    handleOpenChange(false)
                    onSuccess()
                    if (triggerToast) {
                        triggerToast("success", t("admin.servers.deleteSuccess", { name: server.name }))
                    }
                } else {
                    if (triggerToast) {
                        triggerToast("error", res.message_key ? t(res.message_key) : (res.message || t("admin.servers.deleteError")))
                    }
                }
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.deleteError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.servers.deleteTitle")}</DialogTitle>
                    <DialogDescription>{t("admin.servers.deleteDesc", { name: server.name })}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor={`confirm-${server.id}`}>{t("admin.servers.typeConfirm")}</Label>
                        <Input
                            id={`confirm-${server.id}`}
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={t("admin.servers.confirmText")}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" variant="destructive" disabled={loading || confirmText !== t("admin.servers.confirmText")}>
                            {loading ? t("admin.servers.deleting") : t("admin.servers.delete")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}