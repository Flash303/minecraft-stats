import { useState } from "react"
import type { Server } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { Input } from "@/ui/components/input"
import { Label } from "@/ui/components/label"
import { Edit2, RefreshCw } from "lucide-react"
import { useAuth } from "@clerk/react"
import { updateServerIp, pingServerIp } from "@/core/lib/api"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/components/dialog"
import { MinecraftMotd } from "@/ui/motd"

export function ChangeIpModal({ server, onSuccess, triggerToast, t }: { server: Server, onSuccess: () => void, triggerToast?: (type: "success" | "warning" | "error", text: string) => void, t: (key: string, options?: Record<string, string>) => string }) {
    const { getToken } = useAuth()
    const [open, setOpen] = useState(false)
    const [confirmText, setConfirmText] = useState("")
    const [ip, setIp] = useState(server.ip)
    const [port, setPort] = useState(server.port.toString())
    
    const [loadingPing, setLoadingPing] = useState(false)
    const [pingResult, setPingResult] = useState<{ is_reachable: boolean, motd?: any, version?: string, favicon?: string, current_players?: number, max_players?: number } | null>(null)
    const [loading, setLoading] = useState(false)

    const handlePing = async () => {
        if (!ip || !port) return
        setLoadingPing(true)
        setPingResult(null)
        try {
            const token = await getToken()
            if (token) {
                const res = await pingServerIp(server.id, ip, parseInt(port), token)
                if (res.success && res.data) {
                    setPingResult(res.data)
                } else {
                    if (triggerToast) triggerToast("error", t("admin.servers.pingError"))
                }
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.pingError"))
        } finally {
            setLoadingPing(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (confirmText !== t("admin.servers.confirmText")) return

        setLoading(true)
        try {
            const token = await getToken()
            if (token) {
                const res = await updateServerIp(server.id, ip, parseInt(port), token)
                if (res.success) {
                    setOpen(false)
                    onSuccess()
                    if (triggerToast) {
                        triggerToast("success", t("admin.servers.changeIpSuccess", { name: server.name }))
                    }
                } else {
                    if (triggerToast) {
                        triggerToast("error", res.message_key ? t(res.message_key) : (res.message || t("admin.servers.changeIpError")))
                    }
                }
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.changeIpError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => {
            if (!v) {
                setConfirmText("")
                setPingResult(null)
                setIp(server.ip)
                setPort(server.port.toString())
            }
            setOpen(v)
        }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    <Edit2 className="h-3 w-3" />
                    {t("admin.servers.changeIp")}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.servers.changeIpTitle")}</DialogTitle>
                    <DialogDescription>{t("admin.servers.changeIpDesc", { name: server.name })}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 gap-4 items-end">
                        <div className="grid gap-2 col-span-2">
                            <Label htmlFor={`ip-${server.id}`}>{t("admin.servers.newIp")}</Label>
                            <Input
                                id={`ip-${server.id}`}
                                value={ip}
                                onChange={(e) => setIp(e.target.value)}
                                placeholder="play.example.com"
                                required
                            />
                        </div>
                        <div className="grid gap-2 col-span-1">
                            <Label htmlFor={`port-${server.id}`}>{t("admin.servers.port")}</Label>
                            <Input
                                id={`port-${server.id}`}
                                value={port}
                                onChange={(e) => setPort(e.target.value)}
                                placeholder="25565"
                                type="number"
                                required
                            />
                        </div>
                        <Button type="button" variant="secondary" onClick={handlePing} disabled={loadingPing}>
                            {loadingPing ? <RefreshCw className="h-4 w-4 animate-spin" /> : t("admin.servers.pingBtn")}
                        </Button>
                    </div>

                    {pingResult && (
                        <div className="rounded-md border p-4 bg-muted/50 overflow-hidden">
                            {pingResult.is_reachable ? (
                                <div className="space-y-4 flex flex-col items-center">
                                    <div className="flex items-center gap-2 w-full">
                                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></div>
                                        <span className="text-sm font-medium">{t("admin.servers.reachable")}</span>
                                        {pingResult.version && <span className="text-xs text-muted-foreground ml-auto truncate">{pingResult.version}</span>}
                                    </div>
                                    {pingResult.motd && (
                                        <div className="w-full max-w-full overflow-x-auto flex justify-center pb-2">
                                            <div className="w-fit overflow-hidden rounded-md shadow-xl transform origin-top md:scale-90 lg:scale-100">
                                                <MinecraftMotd 
                                                    motd={pingResult.motd} 
                                                    serverName={server.name}
                                                    currentPlayers={pingResult.current_players || 0}
                                                    maxPlayers={pingResult.max_players || 20}
                                                    favicon={pingResult.favicon}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                    <span className="text-sm font-medium text-destructive">{t("admin.servers.unreachable")}</span>
                                </div>
                            )}
                        </div>
                    )}

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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={loading || confirmText !== t("admin.servers.confirmText")}>
                            {loading ? t("admin.servers.saving") : t("admin.servers.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
