/**
 * Java network protocol <-> displayable Minecraft version mapping.
 *
 * Upstream source of truth (maintained by a bot on every release):
 *   https://github.com/PrismarineJS/minecraft-data/blob/master/data/pc/common/protocolVersions.json
 *   (stable URL on the `master` branch, auto-updated — see the history entry
 *   "Add 1.21.x to pc protocolVersions.json").
 *
 * Why a vendored copy instead of a runtime fetch?
 * - SSR + client determinism: the same table is used on both sides, so there
 *   is no hydration mismatch risk (#418) and no external network dependency
 *   during render (see AGENTS.md: data fetching stays client-side, rendering
 *   must stay fluid and synchronous).
 * - No third-party CDN latency/failure on the critical rendering path.
 *
 * Update (run for every Minecraft minor release, or via CI):
 *   bun run update:protocols
 * The `scripts/update-minecraft-protocols.mjs` script regenerates the
 * `JAVA_RELEASE_PROTOCOL_VERSIONS` block below from the upstream URL.
 *
 * Scope: Java releases only (`usesNetty: true`, `releaseType: "release"`).
 * Snapshots / pre-releases / RCs share the same number space with sentinel
 * values (>= 2^30) and are not displayed. Bedrock uses a different numbering
 * scheme: no protocol fallback for `type: "bedrock"`.
 */

// <-- BEGIN GENERATED BLOCK (do not edit by hand, see `bun run update:protocols`) -->
export const JAVA_RELEASE_PROTOCOL_VERSIONS: Record<number, string> = {
    4: "1.7.2 - 1.7.5",
    5: "1.7.6 - 1.7.10",
    47: "1.8 - 1.8.9",
    107: "1.9",
    108: "1.9.1",
    109: "1.9.2",
    110: "1.9.3 - 1.9.4",
    210: "1.10 - 1.10.2",
    315: "1.11",
    316: "1.11.1 - 1.11.2",
    335: "1.12",
    338: "1.12.1",
    340: "1.12.2",
    393: "1.13",
    401: "1.13.1",
    404: "1.13.2",
    477: "1.14",
    480: "1.14.1",
    485: "1.14.2",
    490: "1.14.3",
    498: "1.14.4",
    573: "1.15",
    575: "1.15.1",
    578: "1.15.2",
    735: "1.16",
    736: "1.16.1",
    751: "1.16.2",
    753: "1.16.3",
    754: "1.16.4 - 1.16.5",
    755: "1.17",
    756: "1.17.1",
    757: "1.18 - 1.18.1",
    758: "1.18.2",
    759: "1.19",
    760: "1.19.1 - 1.19.2",
    761: "1.19.3",
    762: "1.19.4",
    763: "1.20 - 1.20.1",
    764: "1.20.2",
    765: "1.20.3 - 1.20.4",
    766: "1.20.5 - 1.20.6",
    767: "1.21 - 1.21.1",
    768: "1.21.2 - 1.21.3",
    769: "1.21.4",
    770: "1.21.5",
    771: "1.21.6",
    772: "1.21.7 - 1.21.8",
    773: "1.21.9 - 1.21.10",
    774: "1.21.11",
    775: "26.1 - 26.1.2",
    776: "26.2",
    777: "26.3",
}
// <-- END GENERATED BLOCK -->

/**
 * Resolves a network protocol number to a displayable Minecraft version.
 *
 * @returns the version (e.g. "1.21.4", "1.21.7 - 1.21.8"), or `null` if:
 * - the protocol is missing, unknown or a sentinel value (<= 0: maintenance,
 *   custom MOTD),
 * - the server is Bedrock (different numbering, not covered).
 */
export function resolveProtocolVersion(
    protocolVersion: number | null | undefined,
    serverType?: string | null,
): string | null {
    if (protocolVersion == null || protocolVersion <= 0) return null
    if (serverType === "bedrock") return null
    return JAVA_RELEASE_PROTOCOL_VERSIONS[protocolVersion] ?? null
}
