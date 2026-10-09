export type MotdComponent =
    | string
    | {
          text?: string
          color?: string
          font?: string
          bold?: boolean
          italic?: boolean
          underlined?: boolean
          strikethrough?: boolean
          obfuscated?: boolean
          shadow_color?: number
          atlas?: string
          sprite?: string
          hat?: boolean
          player?: {
              name?: string
              properties?: Array<{
                  name: string
                  value: string
              }>
          }
          extra?: MotdComponent[]
      }

export interface MinecraftMotdProps {
    motd: MotdInputNode
    className?: string
    serverName?: string
    currentPlayers?: number | string
    maxPlayers?: number | string
    favicon?: string | null
    pingTime?: number | null
    lastSample?: string | null
    backgroundUrl?: string | null
}

/** Arbitrary server-provided MOTD JSON (recursive text/extra/description nodes). */
export type MotdInputNode = string | MotdInputObject | MotdInputNode[]

export interface MotdInputObject {
    text?: string | MotdInputNode
    extra?: MotdInputNode[]
    description?: MotdInputNode
    color?: string
    font?: string
    shadow_color?: unknown
    bold?: boolean
    italic?: boolean
    underlined?: boolean
    strikethrough?: boolean
    obfuscated?: boolean
    sprite?: string
    atlas?: string
    hat?: boolean
    player?: string | { name?: string; properties?: Array<{ name: string; value?: string }> }
}

/** Formatting inherited from ancestor nodes while flattening. */
export interface MotdInheritedStyle {
    color?: string
    font?: string
    shadow_color?: unknown
    bold?: boolean
    italic?: boolean
    underlined?: boolean
    strikethrough?: boolean
    obfuscated?: boolean
}