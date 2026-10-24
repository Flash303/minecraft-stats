import type { MetaFunction } from "react-router"
import type { Language } from "@/core/lib/i18n"
import { resolveMetaLanguage, staticPageMeta, type RouteMetaHandle } from "@/core/lib/seo-meta"
import { LegalPage, legalMetaStrings } from "@/ui/components/LegalPage"

const NAMESPACE = "privacy" as const
const PATH = "/privacy"

export const meta: MetaFunction = ({ matches }) =>
    staticPageMeta({ ...legalMetaStrings(resolveMetaLanguage(matches), NAMESPACE), path: PATH })

export const handle: RouteMetaHandle = {
    getDocumentMeta: (_data: unknown, lang: Language) => legalMetaStrings(lang, NAMESPACE),
}

export default function Privacy() {
    return <LegalPage namespace={NAMESPACE} />
}
