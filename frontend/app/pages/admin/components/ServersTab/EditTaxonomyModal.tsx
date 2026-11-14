import { useMemo, useState } from "react"
import type { Server } from "@/core/lib/api"
import { updateServerDetails } from "@/core/lib/api"
import { Button } from "@/ui/components/button"
import { useAuth } from "@clerk/react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/ui/components/dialog"
import { TaxonomyMultiSelect } from "@/ui/components/TaxonomyMultiSelect"
import { getCategoryOptions, getLanguageOptions } from "@/ui/components/TaxonomyIcons"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { normalizeCategories, normalizeLanguages } from "@/core/lib/server-taxonomy"

interface EditTaxonomyModalProps {
    server: Server
    onSuccess: () => void
    triggerToast?: (type: "success" | "warning" | "error", text: string) => void
    t: (key: string, options?: Record<string, string>) => string
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function EditTaxonomyModal({ server, onSuccess, triggerToast, t, open, onOpenChange }: EditTaxonomyModalProps) {
    const { t: translate } = useLanguage()
    const { getToken } = useAuth()
    const [categories, setCategories] = useState<string[]>(() => normalizeCategories(server.categories))
    const [languages, setLanguages] = useState<string[]>(() => normalizeLanguages(server.languages))
    const [loading, setLoading] = useState(false)

    const categoryOptions = useMemo(() => getCategoryOptions(translate), [translate])
    const languageOptions = useMemo(() => getLanguageOptions(translate), [translate])

    const handleOpenChange = (v: boolean) => {
        if (!v) {
            setCategories(normalizeCategories(server.categories))
            setLanguages(normalizeLanguages(server.languages))
        }
        onOpenChange(v)
    }

    const normCategories = normalizeCategories(categories)
    const normLanguages = normalizeLanguages(languages)
    const canSubmit =
        normCategories.length > 0 &&
        normLanguages.length > 0 &&
        (JSON.stringify(normCategories) !== JSON.stringify(normalizeCategories(server.categories)) ||
            JSON.stringify(normLanguages) !== JSON.stringify(normalizeLanguages(server.languages)))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (normCategories.length === 0 || normLanguages.length === 0) {
            if (triggerToast) triggerToast("error", t("admin.servers.editTaxonomyError"))
            return
        }

        setLoading(true)
        try {
            const token = await getToken()
            if (!token) return
            const res = await updateServerDetails(
                server.id,
                { categories: normCategories, languages: normLanguages },
                token
            )
            if (res.success) {
                handleOpenChange(false)
                onSuccess()
                if (triggerToast) {
                    triggerToast("success", t("admin.servers.editTaxonomySuccess", { name: server.name }))
                }
            } else if (triggerToast) {
                triggerToast("error", res.message_key ? t(res.message_key) : (res.message || t("admin.servers.editTaxonomyError")))
            }
        } catch (error) {
            console.error(error)
            if (triggerToast) triggerToast("error", t("admin.servers.editTaxonomyError"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>{t("admin.servers.editTaxonomyTitle")}</DialogTitle>
                    <DialogDescription>{t("admin.servers.editTaxonomyDesc", { name: server.name })}</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <TaxonomyMultiSelect
                            label={translate("addServer.categoriesLabel")}
                            options={categoryOptions}
                            selected={categories}
                            onChange={setCategories}
                        />
                        <p className="text-xs text-muted-foreground">{translate("addServer.categoriesHint")}</p>
                    </div>
                    <div className="grid gap-2">
                        <TaxonomyMultiSelect
                            label={translate("addServer.languagesLabel")}
                            options={languageOptions}
                            selected={languages}
                            onChange={setLanguages}
                        />
                        <p className="text-xs text-muted-foreground">{translate("addServer.languagesHint")}</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>{t("common.cancel")}</Button>
                        <Button type="submit" disabled={loading || !canSubmit}>
                            {loading ? t("admin.servers.saving") : t("admin.servers.save")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
