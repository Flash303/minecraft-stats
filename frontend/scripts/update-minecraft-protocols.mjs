/**
 * Régénère le bloc `JAVA_RELEASE_PROTOCOL_VERSIONS` de
 * `app/core/lib/minecraft-protocols.ts` depuis l'upstream PrismarineJS.
 *
 * Usage :  bun run update:protocols   (ou `node scripts/update-minecraft-protocols.mjs`)
 *
 * Source (URL stable, branche `master`, auto-mise à jour par bot à chaque sortie) :
 *   https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/common/protocolVersions.json
 *
 * Règles de filtrage (doivent rester synchronisées avec l'en-tête du fichier cible) :
 * - `usesNetty === true` uniquement (exclut les protocoles pré-Netty qui réutilisent
 *   les mêmes numéros, ex. protocole 47 = 1.4.2 pré-Netty ET 1.8+ post-Netty),
 * - releases uniquement : `releaseType === "release"`, ou (anciennes entrées sans
 *   `releaseType`) `minecraftVersion` de la forme stricte `X.Y` / `X.Y.Z`,
 * - regroupe par numéro de protocole, tri sémantique ascendant :
 *   une seule version -> "1.21.4", plusieurs -> "1.21.7 - 1.21.8".
 */
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const UPSTREAM_URL =
    "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/common/protocolVersions.json"

const TARGET_FILE = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "app",
    "core",
    "lib",
    "minecraft-protocols.ts",
)
const BEGIN_MARKER = "// <-- BEGIN GENERATED BLOCK"
const END_MARKER = "// <-- END GENERATED BLOCK -->"

const RELEASE_RE = /^\d+\.\d+(\.\d+)?$/

function versionKey(v) {
    return v.split(".").map(Number)
}

function compareVersions(a, b) {
    const ka = versionKey(a)
    const kb = versionKey(b)
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
        const diff = (ka[i] ?? 0) - (kb[i] ?? 0)
        if (diff !== 0) return diff
    }
    return 0
}

const res = await fetch(UPSTREAM_URL)
if (!res.ok) throw new Error(`Upstream fetch failed: ${res.status} ${res.statusText}`)
const data = await res.json()

const byProtocol = new Map()
for (const entry of data) {
    if (entry.usesNetty !== true) continue
    const name = entry.minecraftVersion
    const isRelease = entry.releaseType === "release" || (entry.releaseType == null && RELEASE_RE.test(name))
    if (!isRelease) continue
    if (!byProtocol.has(entry.version)) byProtocol.set(entry.version, new Set())
    byProtocol.get(entry.version).add(name)
}

const lines = ["export const JAVA_RELEASE_PROTOCOL_VERSIONS: Record<number, string> = {"]
for (const protocol of [...byProtocol.keys()].sort((a, b) => a - b)) {
    const versions = [...byProtocol.get(protocol)].sort(compareVersions)
    const display = versions.length === 1 ? versions[0] : `${versions[0]} - ${versions[versions.length - 1]}`
    lines.push(`    ${protocol}: "${display}",`)
}
lines.push("}")
const block = `${BEGIN_MARKER} (ne pas éditer à la main, voir \`bun run update:protocols\`) -->\n${lines.join("\n")}\n${END_MARKER}`

const current = readFileSync(TARGET_FILE, "utf8")
const start = current.indexOf(BEGIN_MARKER)
const end = current.indexOf(END_MARKER)
if (start === -1 || end === -1 || end < start) throw new Error("Generated block markers not found in target file")
const endOfLine = current.indexOf("\n", end)
const next = current.slice(start, endOfLine + 1)
if (next === block + "\n") {
    console.log(`Up to date: ${byProtocol.size} protocols, no change.`)
} else {
    writeFileSync(TARGET_FILE, current.slice(0, start) + block + current.slice(endOfLine + 1))
    console.log(`Updated ${TARGET_FILE}: ${byProtocol.size} protocols.`)
}
