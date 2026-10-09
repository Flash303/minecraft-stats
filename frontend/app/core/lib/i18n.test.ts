import { describe, it, expect } from "vitest"
import { registerTranslations, translate } from "./i18n"

describe("translate", () => {
    it("returns the key when the dictionary is missing", () => {
        expect(translate("ko", "some.missing.key")).toBe("some.missing.key")
    })

    it("resolves nested keys and replacements", () => {
        registerTranslations("en", {
            chart: { title: "Players", subtitle: "Top {{count}} servers" },
            count: 3,
        })
        expect(translate("en", "chart.title")).toBe("Players")
        expect(translate("en", "chart.subtitle", { count: "10" })).toBe("Top 10 servers")
        expect(translate("en", "count")).toBe("count")
    })

    it("falls back to the key for missing or non-string nodes", () => {
        registerTranslations("de", { section: { missing: "x" } })
        expect(translate("de", "section.absent")).toBe("section.absent")
        expect(translate("de", "section.missing.deep")).toBe("section.missing.deep")
    })
})
