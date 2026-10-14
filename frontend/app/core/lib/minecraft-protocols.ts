/**
 * Mapping protocole réseau Java <-> version Minecraft affichable.
 *
 * Source de vérité (upstream, maintenu par bot à chaque sortie) :
 *   https://github.com/PrismarineJS/minecraft-data/blob/master/data/pc/common/protocolVersions.json
 *   (URL stable sur la branche `master`, auto-mise à jour — voir l'historique
 *   "Add 1.21.x to pc protocolVersions.json").
 *
 * Pourquoi une copie vendored plutôt qu'un fetch runtime ?
 * - Déterminisme SSR + client : la même table est utilisée des deux côtés, donc
 *   aucun risque de mismatch d'hydratation (#418) ni de dépendance réseau externe
 *   au rendu (cf. AGENTS.md : le data-fetching reste côté client, le rendu doit
 *   rester fluide et synchrone).
 * - Pas de latence / panne d'un CDN tiers sur le chemin critique d'affichage.
 *
 * Mise à jour (à relancer à chaque version mineure de Minecraft, ou via CI) :
 *   bun run update:protocols
 * Le script `scripts/update-minecraft-protocols.mjs` régénère le bloc
 * `JAVA_RELEASE_PROTOCOL_VERSIONS` ci-dessous depuis l'URL upstream.
 *
 * Périmètre : releases Java uniquement (`usesNetty: true`, `releaseType: "release"`).
 * Les snapshots / pre-releases / RCs partagent le même espace de numéros avec des
 * valeurs sentinelles (>= 2^30) et ne sont pas affichés. Bedrock utilise une
 * numérotation différente : aucun fallback protocole pour `type: "bedrock"`.
 */

// <-- BEGIN GENERATED BLOCK (ne pas éditer à la main, voir `bun run update:protocols`) -->
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
 * Résout un numéro de protocole réseau en version Minecraft affichable.
 *
 * @returns la version (ex. "1.21.4", "1.21.7 - 1.21.8"), ou `null` si :
 * - le protocole est absent, inconnu ou sentinelle (<= 0 : maintenance, MOTD custom),
 * - le serveur est Bedrock (numérotation différente, non couverte).
 */
export function resolveProtocolVersion(
    protocolVersion: number | null | undefined,
    serverType?: string | null,
): string | null {
    if (protocolVersion == null || protocolVersion <= 0) return null
    if (serverType === "bedrock") return null
    return JAVA_RELEASE_PROTOCOL_VERSIONS[protocolVersion] ?? null
}
