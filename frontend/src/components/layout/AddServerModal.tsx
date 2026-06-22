import { useState } from "react"
import { useAuth } from "@clerk/react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createServer } from "@/lib/api"
import { useLanguage } from "@/contexts/LanguageContext"

interface AddServerModalProps {
    onSuccess?: () => void
}

export function AddServerModal({ onSuccess }: AddServerModalProps) {
    const { t } = useLanguage()
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        ip: "",
        port: "25565",
        type: "java" as "java" | "bedrock"
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const token = await getToken()
            if (!token) throw new Error(t("addServer.unauthenticated"))

            const result = await createServer(
                {
                    name: formData.name,
                    ip: formData.ip,
                    port: parseInt(formData.port) || 25565,
                    type: formData.type
                },
                token
            )

            if (result.success) {
                setOpen(false)
                setFormData({ name: "", ip: "", port: "25565", type: "java" })
                onSuccess?.()
            } else {
                setError(result.message || t("addServer.error"))
            }
        } catch (err) {
            setError(t("common.error"))
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t("addServer.button")}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t("addServer.title")}</DialogTitle>
                    <DialogDescription>
                        {t("addServer.description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("addServer.nameLabel")}</Label>
                        <Input
                            id="name"
                            placeholder={t("addServer.namePlaceholder")}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ip">{t("addServer.ipLabel")}</Label>
                        <Input
                            id="ip"
                            placeholder={t("addServer.ipPlaceholder")}
                            value={formData.ip}
                            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select 
                            value={formData.type} 
                            onValueChange={(value: "java" | "bedrock") => setFormData({ ...formData, type: value })}
                        >
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Sélectionner le type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="java">Java</SelectItem>
                                <SelectItem value="bedrock">Bedrock</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="port">{t("addServer.portLabel")}</Label>
                        <Input
                            id="port"
                            type="number"
                            placeholder="25565"
                            value={formData.port}
                            onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                            required
                        />
                    </div>
                    {error && <p className="text-sm font-medium text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? t("addServer.adding") : t("addServer.submit")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
