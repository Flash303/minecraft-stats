import { registerTranslations, type Language } from "./i18n"
import fr from "@/locales/fr.json"
import en from "@/locales/en.json"
import es from "@/locales/es.json"
import it from "@/locales/it.json"
import de from "@/locales/de.json"
import pt from "@/locales/pt.json"
import ru from "@/locales/ru.json"
import pl from "@/locales/pl.json"
import zhCN from "@/locales/zh-CN.json"
import ja from "@/locales/ja.json"
import ko from "@/locales/ko.json"
import nl from "@/locales/nl.json"

// Register all 12 locales BEFORE the SSR render so meta() and the HTML are
// rendered in the language resolved from the cookie/Accept-Language header.
// This module is server-only: dictionaries are not bundled into the client
// (the active language is loaded there via loadLanguage).
const all: Array<[Language, Record<string, unknown>]> = [
    ["fr", fr],
    ["en", en],
    ["es", es],
    ["it", it],
    ["de", de],
    ["pt", pt],
    ["ru", ru],
    ["pl", pl],
    ["zh-CN", zhCN],
    ["ja", ja],
    ["ko", ko],
    ["nl", nl],
]

for (const [lang, dict] of all) {
    registerTranslations(lang, dict)
}