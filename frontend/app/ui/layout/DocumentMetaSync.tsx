import { useEffect } from "react"
import { useMatches } from "react-router"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { applyDocumentMeta, type RouteMetaHandle } from "@/core/lib/seo-meta"

export function DocumentMetaSync() {
    const { language } = useLanguage()
    const matches = useMatches()

    useEffect(() => {
        const leaf = [...matches]
            .reverse()
            .find(
                (m) =>
                    typeof (m.handle as RouteMetaHandle | undefined)?.getDocumentMeta ===
                    "function"
            )
        if (!leaf) return
        const meta = (leaf.handle as RouteMetaHandle).getDocumentMeta?.(leaf.data, language)
        if (meta) applyDocumentMeta(meta)
    }, [language, matches])

    return null
}
