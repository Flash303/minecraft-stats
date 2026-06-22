import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@clerk/react"
import { fetchMyServers, renameServer } from "@/lib/api"
import type { Server } from "@/lib/api"
import { Layout } from "@/components/layout"
import { ServerCard } from "@/components/ServerList/ServerCard"
import { useLanguage } from "@/contexts/LanguageContext"
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
import { Edit2 } from "lucide-react"

export function Account() {
    const { t } = useLanguage()
    const { getToken, isLoaded, isSignedIn } = useAuth()
    const [servers, setServers] = useState<Server[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        if (!isLoaded || !isSignedIn) return
        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const data = await fetchMyServers(token, true)
                setServers(data)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [getToken, isLoaded, isSignedIn])

    useEffect(() => {
        if (isLoaded) {
            load()
        }
    }, [isLoaded, load])

    if (!isSignedIn && isLoaded) {
        return (
            <Layout>
                <div className="flex justify-center py-20">
                    <p className="text-muted-foreground text-lg">Vous devez être connecté.</p>
                </div>
            </Layout>
        )
    }

    return (
        <Layout isLoading={loading} onRefresh={load}>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-8 text-slate-900 dark:text-zinc-100">
                    {t("common.myServers")}
                </h1>
                
                {loading && servers.length === 0 && (
                    <div className="flex justify-center py-20">
                        <p className="text-muted-foreground animate-pulse">{t("common.loading")}</p>
                    </div>
                )}

                {!loading && servers.length === 0 && (
                    <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/20">
                        <p className="text-muted-foreground italic">Vous n'avez pas encore de serveur.</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                    {servers.map((s) => (
                        <div key={s.id} className="relative group">
                            <ServerCard server={s} />
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-background/80 backdrop-blur rounded-lg p-1">
                                <RenameServerModal server={s} onSuccess={load} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Layout>
    )
}

function RenameServerModal({ server, onSuccess }: { server: Server, onSuccess: () => void }) {
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
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer">
                    <Edit2 className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Renommer le serveur</DialogTitle>
                    <DialogDescription>
                        Entrez le nouveau nom de votre serveur.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nom</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Enregistrement..." : "Enregistrer"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
