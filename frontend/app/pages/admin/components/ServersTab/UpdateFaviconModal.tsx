import { useState } from "react"
import type { Server } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { ImageIcon } from "lucide-react"
import { useAuth } from "@clerk/react"
import { updateFavicon } from "@/core/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/components/dialog"

interface UpdateFaviconModalProps {
    server: Server
    onSuccess: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
    t: (key: string, options?: Record<string, string>) => string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UpdateFaviconModal({ server, onSuccess, triggerToast, t, open, onOpenChange }: UpdateFaviconModalProps) {
    const { getToken } = useAuth()
    const [favicon, setFavicon] = useState(server.last_favicon || "")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext("2d");
                if (ctx) {
                    ctx.drawImage(img, 0, 0, 64, 64);
                    const dataUrl = canvas.toDataURL("image/png");
                    setFavicon(dataUrl);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            // Pass null if empty to remove the override
            const payload = favicon.trim() ? favicon.trim() : null
            const res = await updateFavicon(server.id, payload, token)
            if (res.success) {
                onOpenChange(false)
                onSuccess()
            } else {
                setError(res.message_key ? t(res.message_key) : (res.message || t("common.error")))
                if (triggerToast) triggerToast("error", res.message_key ? t(res.message_key) : (res.message || t("common.error")))
            }
        } catch (error) {
            console.error(error)
            setError(t("common.error"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("adminFavicon.title")}</DialogTitle>
                        <DialogDescription>
                            {t("adminFavicon.description")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6">
                        <div className="flex flex-col items-center gap-4">
                            {favicon ? (
                                <img src={favicon} alt="Preview" loading="lazy" decoding="async" className="w-16 h-16 object-contain rounded shadow border bg-muted" />
                            ) : (
                                <div className="w-16 h-16 rounded shadow border border-dashed flex items-center justify-center text-muted-foreground bg-muted">
                                    <ImageIcon className="h-6 w-6 opacity-50" />
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="relative cursor-pointer">
                                    {t("adminFavicon.upload")}
                                    <input
                                        type="file"
                                        accept="image/png, image/jpeg, image/webp"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        onChange={handleImageUpload}
                                    />
                                </Button>
                                {favicon && (
                                    <Button type="button" variant="destructive" size="sm" onClick={() => setFavicon("")}>
                                        {t("adminFavicon.reset")}
                                    </Button>
                                )}
                            </div>
                            {!favicon && (
                                <p className="text-xs text-muted-foreground text-center">
                                    {t("adminFavicon.empty")}
                                </p>
                            )}
                        </div>
                    </div>
                    {error && <div className="px-6 pb-4"><p className="text-sm font-medium text-destructive">{error}</p></div>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? t("admin.servers.renameSaving") : t("admin.servers.renameSave")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
