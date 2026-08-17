import { useState } from "react"
import type { Server } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { Input } from "@/ui/components/input"
import { Label } from "@/ui/components/label"
import { Edit2 } from "lucide-react"
import { useAuth } from "@clerk/react"
import { renameServer } from "@/core/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/components/dialog"

export function RenameServerModal({ server, onSuccess, t }: { server: Server, onSuccess: () => void, t: (key: string, options?: Record<string, string>) => string }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (!name.trim() || name.trim() === server.name) return

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await renameServer(server.id, name.trim(), token)
            if (res.success) {
                setOpen(false)
                onSuccess()
            } else {
                setError(res.message_key ? t(res.message_key) : (res.message || t("admin.servers.renameError")))
            }
        } catch (error) {
            console.error(error)
            setError(t("admin.servers.renameError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-3 w-3" />
                    {t("admin.servers.rename")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{t("admin.servers.renameTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("admin.servers.renameDesc")}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">{t("admin.servers.renameLabel")}</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t("admin.servers.renamePlaceholder")}
                                required
                            />
                        </div>
                    </div>
                    {error && <div className="px-6 pb-4"><p className="text-sm font-medium text-destructive">{error}</p></div>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim() || name.trim() === server.name}>
                            {loading ? t("admin.servers.renameSaving") : t("admin.servers.renameSave")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}