import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/components/dialog";
import { Button } from "@/ui/components/button";
import { Label } from "@/ui/components/label";
import { Input } from "@/ui/components/input";
import { Edit2 } from "lucide-react";
import { useLanguage } from "@/core/contexts/LanguageContext";
import { useAuth } from "@clerk/react";
import { renameServer } from "@/core/lib/api";
import type { Server } from "@/core/lib/api";

export function RenameServerModal({ server, onSuccess }: { server: Server, onSuccess: () => void }) {
    const { t } = useLanguage()
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const res = await renameServer(server.id, name, token)
                if (res.success) {
                    setOpen(false)
                    onSuccess()
                }
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer text-slate-500">
                    <Edit2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("profile.servers.renameTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("profile.servers.renameDesc")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("profile.servers.renameLabel")}</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? t("profile.servers.renameSaving") : t("profile.servers.renameSave")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
