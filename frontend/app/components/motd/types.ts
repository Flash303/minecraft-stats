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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    motd: MotdComponent | MotdComponent[] | any
    className?: string
    serverName?: string
    currentPlayers?: number | string
    maxPlayers?: number | string
    favicon?: string | null
    pingTime?: number | null
    lastSample?: string | null
}