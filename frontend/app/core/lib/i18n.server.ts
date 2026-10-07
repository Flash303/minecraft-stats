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

// Enregistre les 12 locales AVANT le render SSR, pour que les meta() et le HTML
// soient rendus dans la langue résolue par cookie/Accept-Language.
// Ce module n'est importé que côté serveur : les dictionnaires ne sont pas
// embarqués dans le bundle client (la langue active y est chargée via loadLanguage).
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