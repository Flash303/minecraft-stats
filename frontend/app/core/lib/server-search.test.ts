import { describe, it, expect } from "vitest";
import { matchServers, normalizeSearchText, searchServers } from "./server-search";

const servers = [
    { name: "Stelerio", ip: "play.stelerio.net", port: 25565 },
    { name: "Erisium", ip: "play.erisium.gg", port: 25565 },
    { name: "Erik's Realm", ip: "mc.eriksrealm.com", port: 25565 },
    { name: "Hypixel", ip: "mc.hypixel.net", port: 25565 },
    { name: "Hypixel FR", ip: "fr.hypixel.net", port: 25566 },
    { name: "Warcraft Legends", ip: "play.warcraft.gg", port: 25565 },
    { name: "Craft World", ip: "craft.example.com", port: 25565 },
    { name: "HôtelCraft", ip: "hotel.example.com", port: 25565 },
    { name: "§aColorCoded", ip: "colors.example.com", port: 25565 },
    { name: "测试服", ip: "cn.example.com", port: 25565 },
];

const names = (query: string) => searchServers(servers, query).map((s) => s.name);

describe("normalizeSearchText", () => {
    it("lowercases, strips diacritics and collapses separators", () => {
        expect(normalizeSearchText("  Hôtel-Craft §aFR ")).toBe("hotel craft fr");
    });

    it("preserves CJK characters", () => {
        expect(normalizeSearchText("测试服")).toBe("测试服");
    });
});

describe("searchServers ranking", () => {
    it("ranks a prefix match before a mid-word substring ('Eri': Erisium > Stelerio)", () => {
        const result = names("Eri");
        expect(result[0]).toBe("Erisium");
        expect(result).toContain("Stelerio");
        expect(result.indexOf("Erisium")).toBeLessThan(result.indexOf("Stelerio"));
    });

    it("ranks an exact name first", () => {
        expect(names("Hypixel")[0]).toBe("Hypixel");
    });

    it("ranks word-start matches before plain substrings ('craft': 'Craft World' > 'Warcraft Legends')", () => {
        const result = names("craft");
        expect(result.indexOf("Craft World")).toBeLessThan(result.indexOf("Warcraft Legends"));
    });

    it("ranks name matches before IP-only matches", () => {
        // "hypixel" is a name prefix for Hypixel*, but only an IP segment for others.
        const result = names("hypixel");
        expect(result[0]).toBe("Hypixel");
        expect(result[1]).toBe("Hypixel FR");
    });

    it("is case- and accent-insensitive", () => {
        expect(names("HOTEL")).toContain("HôtelCraft");
        expect(names("hôtel")).toContain("HôtelCraft");
    });

    it("ignores Minecraft color codes in names", () => {
        expect(names("color")[0]).toBe("§aColorCoded");
    });

    it("requires every token to match (AND semantics)", () => {
        expect(names("hypixel fr")).toEqual(["Hypixel FR"]);
    });

    it("matches ip:port queries and port-only queries", () => {
        expect(names("play.erisium.gg:25565")[0]).toBe("Erisium");
        expect(names("play.erisium.gg")[0]).toBe("Erisium");
        const byPort = names("25566");
        expect(byPort).toEqual(["Hypixel FR"]);
    });

    it("matches multi-word names typed with separators", () => {
        expect(names("hotel craft")).toEqual(["HôtelCraft"]);
    });

    it("searches CJK names", () => {
        expect(names("测试")).toEqual(["测试服"]);
    });

    it("returns an empty list when nothing matches", () => {
        expect(names("zzzqqq")).toEqual([]);
    });

    it("returns everything in input order for blank queries", () => {
        expect(searchServers(servers, "   ")).toHaveLength(servers.length);
        expect(names("")).toEqual(servers.map((s) => s.name));
    });
});

describe("searchServers fuzzy tolerance (hybrid: 1 edit, 5+ letters, names only)", () => {
    it("matches a transposed typo ('hypixle' -> Hypixel)", () => {
        const result = names("hypixle");
        expect(result).toContain("Hypixel");
        expect(result).toContain("Hypixel FR");
    });

    it("matches a one-letter insertion/deletion typo", () => {
        expect(names("hypixell")).toContain("Hypixel");
        expect(names("hypiel")).toContain("Hypixel");
    });

    it("ranks exact/strict matches above fuzzy ones", () => {
        const result = matchServers(servers, "hypixle");
        const fuzzyScore = result.find((m) => m.server.name === "Hypixel")?.score ?? 0;
        const strictScore = matchServers(servers, "hypixel").find((m) => m.server.name === "Hypixel")?.score ?? 0;
        expect(strictScore).toBeGreaterThan(fuzzyScore);
    });

    it("does not fuzzy-match short tokens", () => {
        // "hy" must only match strict substrings, not typo-guess "Eri..." etc.
        expect(names("hy")).toEqual(["Hypixel", "Hypixel FR"]);
    });

    it("does not fuzzy-match IPs", () => {
        expect(names("mc.hypuzej.net")).toEqual([]);
    });
});
