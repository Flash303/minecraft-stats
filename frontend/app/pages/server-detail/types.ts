/** LabyMod server-media payload (subset actually rendered). */
export interface LabyGamemode {
    name?: string
    command?: string
    color?: string
}

export interface LabyRawInfo {
    social?: Record<string, string | undefined>
    gamemodes?: Record<string, LabyGamemode>
    user_stats?: string
    background?: string
    partner?: boolean
    attachments?: Array<{ file_name?: string; url?: string }>
}

/** LunarClient launcher payload (subset actually rendered). */
export interface LunarRawInfo {
    description?: string
    socials?: Record<string, string>
    website?: string
    store?: string
    gameTypes?: unknown[]
    languages?: unknown[]
    minecraftVersions?: unknown[]
    presentationVideo?: string
}

/** Third-party client infos attached to a server (unvalidated backend JSON). */
export interface ClientInfos {
    laby?: {
        raw?: LabyRawInfo
        background?: string
        partner?: boolean
    }
    lunar?: {
        raw?: LunarRawInfo
        raw_partner?: LunarRawInfo
        background?: string
        partner?: boolean
    }
}

/** LabyMod manifest.json attachment (subset actually rendered). */
export interface LabyManifest {
    supported_languages?: string[]
    yt_trailer?: string
}
