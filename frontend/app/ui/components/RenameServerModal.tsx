import { useState } from "react"
import type { Server } from "@/core/lib/api"
import { renameServer } from "@/core/lib/api"
import { useAuth } from "@clerk/react"
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
import { Input } from "@/ui/components/input"
import { Label } from "@/ui/components/label"

export interface RenameServerTexts {
    title: string
    description: string
    label: string
    save: string
    saving: string
    /** Optional: input placeholder */
    placeholder?: string
    /** Optional: message shown when the API call fails */
    error?: string
}

interface RenameServerModalProps {
    server: Server
    onSuccess: () => void
    texts: RenameServerTexts
    /** Clickable trigger; optional when the modal is controlled via open/onOpenChange */
    trigger?: React.ReactNode
    /** Controlled mode: open + onOpenChange driven by the caller (e.g. actions menu) */
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

/**
 * Server rename modal shared between the account page and the admin console.
 * Labels are provided by the caller (i18n keys differ per context).
 */
export function RenameServerModal({ server, onSuccess, texts, trigger, open: controlledOpen, onOpenChange }: RenameServerModalProps) {
    const { getToken } = useAuth()
    const [internalOpen, setInternalOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const open = controlledOpen ?? internalOpen
    const setOpen = (v: boolean) => {
        if (controlledOpen === undefined || !onOpenChange) setInternalOpen(v)
        onOpenChange?.(v)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        const trimmed = name.trim()
        if (!trimmed || trimmed === server.name) return

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await renameServer(server.id, trimmed, token)
            if (res.success) {
                setOpen(false)
                onSuccess()
            } else {
                setError(res.message || texts.error || null)
            }
        } catch (err) {
            console.error(err)
            setError(texts.error || null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : null}
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>{texts.title}</DialogTitle>
                        <DialogDescription>
                            {texts.description}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="rename-server-name">{texts.label}</Label>
                            <Input
                                id="rename-server-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={texts.placeholder}
                                required
                            />
                        </div>
                    </div>
                    {error && <div className="px-6 pb-4"><p className="text-sm font-medium text-destructive">{error}</p></div>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !name.trim() || name.trim() === server.name}>
                            {loading ? texts.saving : texts.save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
