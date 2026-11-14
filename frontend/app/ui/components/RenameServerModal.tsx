import { useMemo, useState } from "react"
import type { Server } from "@/core/lib/api"
import { updateServerDetails } from "@/core/lib/api"
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
import { TaxonomyMultiSelect } from "@/ui/components/TaxonomyMultiSelect"
import { getCategoryOptions, getLanguageOptions } from "@/ui/components/TaxonomyIcons"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { normalizeCategories, normalizeLanguages } from "@/core/lib/server-taxonomy"

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
 * Server rename + taxonomy modal shared between the account page and the admin console.
 * Labels are provided by the caller (i18n keys differ per context); taxonomy labels
 * come from the shared `taxonomy.*` / `addServer.*` keys.
 */
export function RenameServerModal({ server, onSuccess, texts, trigger, open: controlledOpen, onOpenChange }: RenameServerModalProps) {
    const { t } = useLanguage()
    const { getToken } = useAuth()
    const [internalOpen, setInternalOpen] = useState(false)
    const [name, setName] = useState(server.name)
    const [categories, setCategories] = useState<string[]>(() => normalizeCategories(server.categories))
    const [languages, setLanguages] = useState<string[]>(() => normalizeLanguages(server.languages))
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const open = controlledOpen ?? internalOpen
    const handleOpenChange = (v: boolean) => {
        if (v) {
            setName(server.name)
            setCategories(normalizeCategories(server.categories))
            setLanguages(normalizeLanguages(server.languages))
            setError(null)
        }
        if (controlledOpen === undefined || !onOpenChange) setInternalOpen(v)
        onOpenChange?.(v)
    }

    const categoryOptions = useMemo(() => getCategoryOptions(t), [t])
    const languageOptions = useMemo(() => getLanguageOptions(t), [t])

    const normCategories = normalizeCategories(categories)
    const normLanguages = normalizeLanguages(languages)
    const nameChanged = name.trim() !== "" && name.trim() !== server.name
    const taxonomyChanged =
        JSON.stringify(normCategories) !== JSON.stringify(normalizeCategories(server.categories)) ||
        JSON.stringify(normLanguages) !== JSON.stringify(normalizeLanguages(server.languages))
    const canSubmit = (nameChanged || taxonomyChanged) && normCategories.length > 0 && normLanguages.length > 0

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (normCategories.length === 0) {
            setError(t("addServer.categoriesRequired"))
            return
        }
        if (normLanguages.length === 0) {
            setError(t("addServer.languagesRequired"))
            return
        }
        if (!nameChanged && !taxonomyChanged) return

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await updateServerDetails(
                server.id,
                {
                    ...(nameChanged ? { name: name.trim() } : {}),
                    categories: normCategories,
                    languages: normLanguages,
                },
                token
            )
            if (res.success) {
                handleOpenChange(false)
                onSuccess()
            } else {
                setError(res.message_key ? t(res.message_key) : (res.message || texts.error || null))
            }
        } catch (err) {
            console.error(err)
            setError(texts.error || null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            {trigger ? (
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
            ) : null}
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
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
                        <div className="grid gap-2">
                            <TaxonomyMultiSelect
                                label={t("addServer.categoriesLabel")}
                                options={categoryOptions}
                                selected={categories}
                                onChange={setCategories}
                            />
                        </div>
                        <div className="grid gap-2">
                            <TaxonomyMultiSelect
                                label={t("addServer.languagesLabel")}
                                options={languageOptions}
                                selected={languages}
                                onChange={setLanguages}
                            />
                        </div>
                    </div>
                    {error && <div className="px-6 pb-4"><p className="text-sm font-medium text-destructive">{error}</p></div>}
                    <DialogFooter>
                        <Button type="submit" disabled={loading || !canSubmit}>
                            {loading ? texts.saving : texts.save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
