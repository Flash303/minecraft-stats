import { describe, it, expect } from "vitest"
import { registerTranslations } from "./i18n"
import {
    getServerDocumentMeta,
    resolveMetaLanguage,
    translateMeta,
} from "./seo-meta"
import type { Server } from "./api"

registerTranslations("fr", {
    seo: {
        homeTitle: "Accueil",
        homeDescription: "Description",
        notFoundTitle: "Serveur introuvable",
        notFoundDescription: "Serveur non trouvé",
        serverTitleSuffix: "Statistiques | MS",
        serverDescription: "Voir {{name}} ({{ip}}).",
        statusOnline: "En ligne : {{count}}.",
        statusOffline: "Hors ligne.",
    },
})

const onlineServer = {
    id: 1,
    name: "Hypixel",
    ip: "mc.hypixel.net",
    last_status: "online",
    last_connected: 50000,
} as unknown as Server

const offlineServer = {
    ...onlineServer,
    last_status: "offline",
} as unknown as Server

describe("translateMeta", () => {
    it("never leaks the raw key when the dictionary is missing", () => {
        expect(translateMeta("ja", "seo.homeTitle")).toBe("Accueil")
    })

    it("returns an empty string when the key exists nowhere", () => {
        expect(translateMeta("fr", "seo.nope")).toBe("")
        expect(translateMeta("ja", "seo.nope")).toBe("")
    })
})

describe("resolveMetaLanguage", () => {
    it("reads serverLanguage from the root match loaderData", () => {
        expect(
            resolveMetaLanguage([
                { id: "root", loaderData: { serverLanguage: "ja" } },
                { id: "other", loaderData: {} },
            ])
        ).toBe("ja")
    })

    it("falls back to fr when the root match is absent or invalid", () => {
        expect(resolveMetaLanguage(undefined)).toBe("fr")
        expect(resolveMetaLanguage([])).toBe("fr")
        expect(
            resolveMetaLanguage([{ id: "root", loaderData: { serverLanguage: "xx" } }])
        ).toBe("fr")
    })
})

describe("getServerDocumentMeta", () => {
    it("returns the not-found strings when the server is null", () => {
        expect(getServerDocumentMeta(null, "fr")).toEqual({
            title: "Serveur introuvable",
            description: "Serveur non trouvé",
        })
    })

    it("returns the server title and stats for an online server", () => {
        const meta = getServerDocumentMeta(onlineServer, "fr")
        expect(meta.title).toBe("Hypixel - Statistiques | MS")
        expect(meta.description).toContain("Hypixel")
        expect(meta.description).toContain("mc.hypixel.net")
    })

    it("returns the offline status for an offline server", () => {
        const meta = getServerDocumentMeta(offlineServer, "fr")
        expect(meta.title).toBe("Hypixel - Statistiques | MS")
        expect(meta.description).toContain("Hors ligne.")
    })

    it("falls back to fr instead of leaking keys", () => {
        const meta = getServerDocumentMeta(onlineServer, "ja")
        expect(meta.title).toBe("Hypixel - Statistiques | MS")
        expect(meta.title).not.toContain("seo.")
    })
})
