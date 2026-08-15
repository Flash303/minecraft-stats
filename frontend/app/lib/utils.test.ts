import { expect, test, describe } from "bun:test";
import { parseMinecraftVersionRange } from "./utils";

describe("parseMinecraftVersionRange", () => {
    test("parses comma separated versions", () => {
        expect(parseMinecraftVersionRange("Waterfall 1.8.x, 1.9.x, 1.10.x")).toEqual(["1.8", "1.10"]);
    });

    test("parses hyphen separated versions", () => {
        expect(parseMinecraftVersionRange("Velocity 1.7.2-1.21.11")).toEqual(["1.7.2", "1.21.11"]);
    });

    test("parses single version with plus", () => {
        expect(parseMinecraftVersionRange("1.21.7+")).toEqual(["1.21.7", "1.21.7"]);
    });

    test("parses slash separated versions", () => {
        expect(parseMinecraftVersionRange("Requires MC 1.8 / 1.21")).toEqual(["1.8", "1.21"]);
    });

    test("parses arbitrary numbers as versions", () => {
        expect(parseMinecraftVersionRange("Velocity 1.7.2-26.1.2")).toEqual(["1.7.2", "26.1.2"]);
    });

    test("returns null when no version is found", () => {
        expect(parseMinecraftVersionRange("No version here")).toBeNull();
    });
});
