/**
 * Client-side builder for Minecraft Java Edition `servers.dat` files.
 *
 * `servers.dat` is an uncompressed NBT file: a root TAG_Compound (empty
 * name) containing a TAG_List named "servers" of TAG_Compound entries, each
 * with a TAG_String "name" and a TAG_String "ip" ("host:port", the port being
 * omitted for the 25565 default).
 *
 * Everything runs in the browser: no new dependency, no server round-trip.
 * Bedrock servers are excluded by the caller (servers.dat is Java-only).
 */

export interface ServersDatEntry {
    name: string
    ip: string
    port: number
}

export const SERVERS_DAT_DEFAULT_PORT = 25565

/** Minimal shape needed to order servers before export. */
export interface SortableServer {
    id: number
    name: string
    last_status?: string | null
    last_connected?: number | null
}

export type ServersDatSort = "popularity" | "popularityAsc" | "name" | "recent"
export type ServersDatOfflinePlacement = "last" | "first"

export interface ServersDatExportOptions {
    sort?: ServersDatSort
    offlinePlacement?: ServersDatOfflinePlacement
    ignoreOffline?: boolean
}

/** Online servers rank by live player count, offline ones always last. */
function playerCountForSort(server: SortableServer): number {
    return server.last_status === "online" ? (server.last_connected ?? 0) : -1
}

function sortServerGroup<T extends SortableServer>(list: T[], sort: ServersDatSort): T[] {
    const arr = [...list]
    switch (sort) {
        case "popularityAsc":
            arr.sort(
                (a, b) =>
                    playerCountForSort(a) - playerCountForSort(b) || b.id - a.id
            )
            break
        case "name":
            arr.sort((a, b) => a.name.localeCompare(b.name))
            break
        case "recent":
            arr.sort((a, b) => b.id - a.id)
            break
        case "popularity":
        default:
            arr.sort(
                (a, b) =>
                    playerCountForSort(b) - playerCountForSort(a) || b.id - a.id
            )
            break
    }
    return arr
}

/**
 * Orders servers for export: each status group (online/offline) is sorted
 * with the chosen criterion, then concatenated according to
 * `offlinePlacement` — or offline servers are dropped with `ignoreOffline`.
 */
export function orderServersForExport<T extends SortableServer>(
    servers: T[],
    options: ServersDatExportOptions = {}
): T[] {
    const { sort = "popularity", offlinePlacement = "last", ignoreOffline = false } = options
    const online = sortServerGroup(
        servers.filter((s) => s.last_status === "online"),
        sort
    )
    if (ignoreOffline) return online
    const offline = sortServerGroup(
        servers.filter((s) => s.last_status !== "online"),
        sort
    )
    return offlinePlacement === "first" ? [...offline, ...online] : [...online, ...offline]
}

/** "host:port" address as expected by the Minecraft client. */
export function toServersDatAddress(ip: string, port: number): string {
    return port === SERVERS_DAT_DEFAULT_PORT ? ip : `${ip}:${port}`
}

const encoder = new TextEncoder()

function pushU16BE(out: number[], value: number): void {
    out.push((value >>> 8) & 0xff, value & 0xff)
}

function pushI32BE(out: number[], value: number): void {
    out.push(
        (value >>> 24) & 0xff,
        (value >>> 16) & 0xff,
        (value >>> 8) & 0xff,
        value & 0xff
    )
}

function pushStringPayload(out: number[], value: string): void {
    const bytes = encoder.encode(value)
    pushU16BE(out, bytes.length)
    for (const b of bytes) out.push(b)
}

/** TAG_String with its field name, e.g. (0x08, "name", value). */
function pushNamedString(out: number[], fieldName: string, value: string): void {
    out.push(0x08)
    const nameBytes = encoder.encode(fieldName)
    pushU16BE(out, nameBytes.length)
    for (const b of nameBytes) out.push(b)
    pushStringPayload(out, value)
}

/**
 * Builds an uncompressed NBT `servers.dat` payload for the given servers.
 * Returns the raw file bytes, ready to be saved as "servers.dat".
 */
export function buildServersDat(servers: ServersDatEntry[]): Uint8Array {
    const out: number[] = []

    // Root TAG_Compound with an empty name.
    out.push(0x0a, 0x00, 0x00)

    // TAG_List "servers" of TAG_Compound (element type 0x0a).
    out.push(0x09)
    const listName = encoder.encode("servers")
    pushU16BE(out, listName.length)
    for (const b of listName) out.push(b)
    out.push(0x0a)
    pushI32BE(out, servers.length)

    for (const server of servers) {
        const name = server.name.trim() || server.ip
        pushNamedString(out, "name", name)
        pushNamedString(out, "ip", toServersDatAddress(server.ip, server.port))
        // TAG_End: closes the server compound.
        out.push(0x00)
    }

    // TAG_End: closes the root compound.
    out.push(0x00)

    return new Uint8Array(out)
}

/**
 * Triggers the download of a `servers.dat` file in the browser.
 * Returns the number of servers written.
 */export function downloadServersDat(
    servers: ServersDatEntry[],
    filename = "servers.dat"
): number {
    const bytes = buildServersDat(servers)
    // Copy into a fresh ArrayBuffer: `bytes.buffer` may be a shared pool
    // whose byteOffset/length upset some Blob implementations.
    const buffer = new Uint8Array(bytes.length)
    buffer.set(bytes)
    const blob = new Blob([buffer], { type: "application/octet-stream" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    return servers.length
}
