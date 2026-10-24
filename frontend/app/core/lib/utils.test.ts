import { describe, it, expect } from "vitest"
import { registerTranslations } from "./i18n"
import { formatDate, formatNumber } from "./utils"

// Minimal dictionaries: formatDate only depends on common.months and
// common.dateFormat (same contract as the real locales).
registerTranslations("fr", {
    common: {
        months: {
            0: "janvier",
            8: "septembre",
            9: "octobre",
        },
        dateFormat: "{{day}} {{month}} {{year}}",
    },
})

describe("formatDate", () => {
    // 13 October 2026 23:30 UTC: in Europe/Paris (UTC+2) it is already the
    // 14th, in Kiritimati (UTC+14) the 14th at 13:30. With local getters, the
    // SSR HTML (UTC) and the client render diverged -> hydration error #418.
    const nearMidnightUtc = Date.UTC(2026, 9, 13, 23, 30)

    it("renders the same UTC calendar date regardless of runtime timezone", () => {
        const outputs = new Set<string>()
        for (const tz of ["UTC", "Europe/Paris", "America/New_York", "Pacific/Kiritimati", "Australia/Sydney"]) {
            process.env.TZ = tz
            outputs.add(formatDate(nearMidnightUtc, "fr"))
        }
        process.env.TZ = "UTC"
        expect(outputs.size).toBe(1)
        expect([...outputs][0]).toBe("13 octobre 2026")
    })

    it("formats a regular date", () => {
        process.env.TZ = "Europe/Paris"
        expect(formatDate(Date.UTC(2026, 8, 5, 12, 0), "fr")).toBe("5 septembre 2026")
        process.env.TZ = "UTC"
    })
})

describe("formatNumber", () => {
    it("groups thousands deterministically per language", () => {
        expect(formatNumber("fr", 1234567)).toBe("1\u202F234\u202F567")
        expect(formatNumber("en", 1234567)).toBe("1,234,567")
        expect(formatNumber("fr", 0)).toBe("0")
    })
})
