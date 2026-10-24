import { describe, it, expect } from "vitest"
import { formatMinecraftVersion, resolveServerVersion } from "./utils"
import { resolveProtocolVersion } from "./minecraft-protocols"

describe("formatMinecraftVersion", () => {
    it("returns null for missing versions", () => {
        expect(formatMinecraftVersion(null)).toBeNull()
        expect(formatMinecraftVersion(undefined)).toBeNull()
        expect(formatMinecraftVersion("")).toBeNull()
    })

    it("never returns raw custom names (reported bug)", () => {
        // Server with a custom version name: no X.Y(.Z) pattern -> null,
        // never the raw string ("Version ᴏɴʟɪɴᴇ: 12136 ...").
        expect(formatMinecraftVersion("ᴏɴʟɪɴᴇ: 12136 ɢʀᴀᴄᴢʏ")).toBeNull()
        expect(formatMinecraftVersion("Online: 12136")).toBeNull()
        expect(formatMinecraftVersion("Maintenance")).toBeNull()
    })

    it("extracts single versions", () => {
        expect(formatMinecraftVersion("1.20.1")).toBe("1.20.1")
        expect(formatMinecraftVersion("Paper 1.21.4")).toBe("1.21.4")
        expect(formatMinecraftVersion("1.21.44")).toBe("1.21.44")
    })

    it("extracts ranges as first - last", () => {
        expect(formatMinecraftVersion("BungeeCord 1.8 - 1.21")).toBe("1.8 - 1.21")
        expect(formatMinecraftVersion("1.8.9 - 1.21.4")).toBe("1.8.9 - 1.21.4")
    })
})

describe("resolveProtocolVersion", () => {
    it("returns null for missing or sentinel protocols", () => {
        expect(resolveProtocolVersion(null, "java")).toBeNull()
        expect(resolveProtocolVersion(undefined, "java")).toBeNull()
        // Sentinel protocol (maintenance / custom MOTD) -> badge hidden
        expect(resolveProtocolVersion(-1, "java")).toBeNull()
        expect(resolveProtocolVersion(0, "java")).toBeNull()
    })

    it("maps known Java protocols to release versions", () => {
        expect(resolveProtocolVersion(769, "java")).toBe("1.21.4")
        expect(resolveProtocolVersion(772, "java")).toBe("1.21.7 - 1.21.8")
        expect(resolveProtocolVersion(47, "java")).toBe("1.8 - 1.8.9")
    })

    it("returns null for unknown protocols", () => {
        expect(resolveProtocolVersion(999999, "java")).toBeNull()
    })

    it("never applies the Java table to Bedrock (different numbering)", () => {
        expect(resolveProtocolVersion(769, "bedrock")).toBeNull()
    })
})

describe("resolveServerVersion", () => {
    it("prefers the declared version when it is a real one", () => {
        expect(resolveServerVersion("Paper 1.20.4", 769, "java")).toBe("1.20.4")
    })

    it("falls back to the protocol for custom names", () => {
        expect(resolveServerVersion("ᴏɴʟɪɴᴇ: 12136 ɢʀᴀᴄᴢʏ", 769, "java")).toBe("1.21.4")
        expect(resolveServerVersion(null, 772, "java")).toBe("1.21.7 - 1.21.8")
    })

    it("returns null when nothing displayable (badge hidden)", () => {
        expect(resolveServerVersion("ᴏɴʟɪɴᴇ: 12136", -1, "java")).toBeNull()
        expect(resolveServerVersion("Maintenance", 999999, "java")).toBeNull()
        expect(resolveServerVersion(null, null, "java")).toBeNull()
    })
})
