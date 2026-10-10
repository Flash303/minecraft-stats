import { describe, it, expect } from "vitest"
import {
    flattenMotd,
    getCharWidth,
    generateHiddenString,
    getShadowColor,
    parseArgb,
    wrapMinecraftText,
} from "./utils"
import type { MotdInputNode } from "./types"

// Out-of-contract input stays safe at runtime.
const offContract = (v: unknown): MotdInputNode => v as MotdInputNode

describe("flattenMotd", () => {
    it("passes strings through and joins arrays", () => {
        expect(flattenMotd("hello", {})).toBe("hello")
        expect(flattenMotd(["a", "b"], {})).toBe("ab")
    })

    it("returns empty string for nullish or non-object input", () => {
        expect(flattenMotd(offContract(null), {})).toBe("")
        expect(flattenMotd(offContract(42), {})).toBe("")
    })

    it("unwraps description nodes", () => {
        expect(flattenMotd({ description: "x" }, {})).toBe("x")
    })

    it("emits legacy codes for color and formats", () => {
        expect(flattenMotd({ text: "hi", color: "red" }, {})).toBe("§chi§r")
        expect(flattenMotd({ text: "hi", bold: true }, {})).toBe("§lhi§r")
        expect(flattenMotd({ text: "hi", color: "#ff0000" }, {})).toBe("&#ff0000hi§r")
    })

    it("renders extras with a sibling reset", () => {
        expect(
            flattenMotd({ text: "a", extra: [{ text: "b", color: "blue" }] }, {})
        ).toBe("a§9b§r§r")
    })

    it("renders sprites and player heads", () => {
        expect(flattenMotd({ sprite: "s1" }, {})).toBe("&s{s1};§r")
        expect(flattenMotd({ player: "Notch" }, {})).toBe("&head{name:Notch|false};§r")
    })
})

describe("getCharWidth", () => {
    it("measures narrow, regular and newline characters", () => {
        expect(getCharWidth("i", false)).toBe(2)
        expect(getCharWidth("W", false)).toBe(6)
        expect(getCharWidth("\n", true)).toBe(0)
    })

    it("adds one pixel for bold text", () => {
        expect(getCharWidth("W", true)).toBe(7)
    })
})

describe("generateHiddenString", () => {
    it("fills the target width", () => {
        expect(generateHiddenString(10)).toBe("- ")
        expect(generateHiddenString(0)).toBe("")
    })
})

describe("getShadowColor", () => {
    it("darkens hex colors and defaults without input", () => {
        expect(getShadowColor("#ff0000")).toBe("rgba(63, 0, 0, 1)")
        expect(getShadowColor(undefined)).toBe("rgba(0,0,0,1)")
    })
})

describe("parseArgb", () => {
    it("splits channels", () => {
        expect(parseArgb(0xff112233)).toBe("rgba(17, 34, 51, 1)")
    })
})

describe("wrapMinecraftText", () => {
    it("splits long words and honors explicit newlines", () => {
        expect(wrapMinecraftText("abcdefghij", 20)).toBe("abc\ndef\nghij")
        expect(wrapMinecraftText("a\nb", 100)).toBe("a\nb")
    })
})
