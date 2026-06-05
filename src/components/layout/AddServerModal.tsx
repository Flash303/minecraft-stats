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
import { createServer } from "@/lib/api"

interface AddServerModalProps {
    onSuccess?: () => void
}

export function AddServerModal({ onSuccess }: AddServerModalProps) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        ip: "",
        port: "25565"
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const token = await getToken()
            if (!token) throw new Error("Non authentifié")

            const result = await createServer(
                {
                    name: formData.name,
                    ip: formData.ip,
                    port: parseInt(formData.port) || 25565
                },
                token
            )

            if (result.success) {
                setOpen(false)
                setFormData({ name: "", ip: "", port: "25565" })
                onSuccess?.()
            } else {
                setError(result.message || "Erreur lors de l'ajout du serveur")
            }
        } catch (err) {
            setError("Une erreur est survenue")
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
                    <span className="hidden sm:inline">Ajouter un serveur</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Ajouter un serveur</DialogTitle>
                    <DialogDescription>
                        Entrez les informations du serveur Minecraft pour commencer le suivi.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nom du serveur</Label>
                        <Input
                            id="name"
                            placeholder="Mon super serveur"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="ip">Adresse IP / Hostname</Label>
                        <Input
                            id="ip"
                            placeholder="play.example.com"
                            value={formData.ip}
                            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="port">Port</Label>
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
                            {loading ? "Ajout en cours..." : "Ajouter le serveur"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
