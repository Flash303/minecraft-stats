import { describe, it, expect } from "vitest"
import {
    buildServersDat,
    orderServersForExport,
    toServersDatAddress,
    type SortableServer,
} from "./servers-dat"

// Minimal NBT reader, just enough to validate the generated servers.dat.
function readU16BE(bytes: Uint8Array, offset: number): number {
    return (bytes[offset]! * 256 + bytes[offset + 1]!) >>> 0
}

function readI32BE(bytes: Uint8Array, offset: number): number {
    return (
        ((bytes[offset]! << 24) |
            (bytes[offset + 1]! << 16) |
            (bytes[offset + 2]! << 8) |
            bytes[offset + 3]!) >>>
        0
    )
}

const decoder = new TextDecoder()

function readString(bytes: Uint8Array, offset: number): { value: string; next: number } {
    const len = readU16BE(bytes, offset)
    const value = decoder.decode(bytes.slice(offset + 2, offset + 2 + len))
    return { value, next: offset + 2 + len }
}

function parseServersDat(bytes: Uint8Array): { name: string; ip: string }[] {
    let o = 0
    // Root TAG_Compound with empty name.
    expect(bytes[o++]).toBe(0x0a)
    expect(readU16BE(bytes, o)).toBe(0)
    o += 2
    // TAG_List "servers" of compounds.
    expect(bytes[o++]).toBe(0x09)
    const listName = readString(bytes, o)
    expect(listName.value).toBe("servers")
    o = listName.next
    expect(bytes[o++]).toBe(0x0a)
    const count = readI32BE(bytes, o)
    o += 4
    const servers: { name: string; ip: string }[] = []
    for (let i = 0; i < count; i++) {
        const fields: Record<string, string> = {}
        for (;;) {
            const tag = bytes[o++]!
            if (tag === 0x00) break
            expect(tag).toBe(0x08)
            const field = readString(bytes, o)
            o = field.next
            const val = readString(bytes, o)
            o = val.next
            fields[field.value] = val.value
        }
        servers.push({ name: fields["name"]!, ip: fields["ip"]! })
    }
    // Root TAG_End + nothing trailing.
    expect(bytes[o++]).toBe(0x00)
    expect(o).toBe(bytes.length)
    return servers
}

describe("orderServersForExport", () => {
    const servers: SortableServer[] = [
        { id: 1, name: "Bravo", last_status: "online", last_connected: 50 },
        { id: 2, name: "Alpha", last_status: "online", last_connected: 200 },
        { id: 3, name: "Charlie", last_status: "offline", last_connected: 999 },
        { id: 4, name: "Delta", last_status: "offline", last_connected: 10 },
    ]
    const names = (list: SortableServer[]) => list.map((s) => s.name)

    it("puts online servers first by default, sorted by players desc", () => {
        expect(names(orderServersForExport(servers))).toEqual([
            "Alpha",
            "Bravo",
            "Delta",
            "Charlie",
        ])
    })

    it("supports ascending popularity", () => {
        expect(names(orderServersForExport(servers, { sort: "popularityAsc" }))).toEqual([
            "Bravo",
            "Alpha",
            "Delta",
            "Charlie",
        ])
    })

    it("places offline servers first when requested", () => {
        expect(
            names(orderServersForExport(servers, { offlinePlacement: "first" }))
        ).toEqual(["Delta", "Charlie", "Alpha", "Bravo"])
    })

    it("drops offline servers with ignoreOffline", () => {
        expect(names(orderServersForExport(servers, { ignoreOffline: true }))).toEqual([
            "Alpha",
            "Bravo",
        ])
    })

    it("supports name and recent sorts", () => {
        expect(names(orderServersForExport(servers, { sort: "name" }))).toEqual([
            "Alpha",
            "Bravo",
            "Charlie",
            "Delta",
        ])
        expect(names(orderServersForExport(servers, { sort: "recent" }))).toEqual([
            "Alpha",
            "Bravo",
            "Delta",
            "Charlie",
        ])
    })
})
describe("toServersDatAddress", () => {
    it("omits the default Java port", () => {
        expect(toServersDatAddress("mc.example.com", 25565)).toBe("mc.example.com")
    })

    it("keeps custom ports", () => {
        expect(toServersDatAddress("mc.example.com", 25566)).toBe("mc.example.com:25566")
    })
})

describe("buildServersDat", () => {
    it("writes a valid servers.dat round-trip", () => {
        const parsed = parseServersDat(
            buildServersDat([
                { name: "Hypixel", ip: "mc.hypixel.net", port: 25565 },
                { name: "Custom", ip: "play.example.com", port: 25566 },
            ])
        )
        expect(parsed).toEqual([
            { name: "Hypixel", ip: "mc.hypixel.net" },
            { name: "Custom", ip: "play.example.com:25566" },
        ])
    })

    it("falls back to the ip when the name is blank", () => {
        const parsed = parseServersDat(
            buildServersDat([{ name: "   ", ip: "mc.example.com", port: 25565 }])
        )
        expect(parsed).toEqual([{ name: "mc.example.com", ip: "mc.example.com" }])
    })

    it("handles unicode names and an empty list", () => {
        const parsed = parseServersDat(
            buildServersDat([{ name: "Érisium ⚔", ip: "mc.erisium.fr", port: 25565 }])
        )
        expect(parsed).toEqual([{ name: "Érisium ⚔", ip: "mc.erisium.fr" }])
        expect(parseServersDat(buildServersDat([]))).toEqual([])
    })
})
