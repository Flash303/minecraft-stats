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
          extra?: MotdComponent[]
      }

export interface MinecraftMotdProps {
    motd: MotdComponent | MotdComponent[] | any
    className?: string
    serverName?: string
    currentPlayers?: number
    maxPlayers?: number
    favicon?: string | null
    pingTime?: number | null
    lastSample?: string | null
}