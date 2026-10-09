import { describe, it, expect } from "vitest"
import { parseLanguageCookie, resolveLanguageFromHeader } from "./accept-language"

describe("parseLanguageCookie", () => {
    it("returns null for missing or foreign cookies", () => {
        expect(parseLanguageCookie(null)).toBeNull()
        expect(parseLanguageCookie("")).toBeNull()
        expect(parseLanguageCookie("session=abc; theme=dark")).toBeNull()
        expect(parseLanguageCookie("language=xx")).toBeNull()
    })

    it("extracts a supported language", () => {
        expect(parseLanguageCookie("language=fr")).toBe("fr")
        expect(parseLanguageCookie("session=abc; language=en; theme=dark")).toBe("en")
        expect(parseLanguageCookie("language=zh-CN")).toBe("zh-CN")
    })
})

describe("resolveLanguageFromHeader", () => {
    it("defaults to French", () => {
        expect(resolveLanguageFromHeader(null)).toBe("fr")
        expect(resolveLanguageFromHeader("")).toBe("fr")
        expect(resolveLanguageFromHeader("xx, yy;q=0.9")).toBe("fr")
    })

    it("honors quality order", () => {
        expect(resolveLanguageFromHeader("en-US,en;q=0.9,fr;q=0.8")).toBe("en")
        expect(resolveLanguageFromHeader("fr-CA,fr;q=0.9,en;q=0.8")).toBe("fr")
        expect(resolveLanguageFromHeader("de-DE,de;q=0.9")).toBe("de")
    })

    it("maps region variants", () => {
        expect(resolveLanguageFromHeader("zh-CN,zh;q=0.9")).toBe("zh-CN")
        expect(resolveLanguageFromHeader("pt-BR")).toBe("pt")
        expect(resolveLanguageFromHeader("es-MX")).toBe("es")
    })
})
