import { useCallback, useEffect, useRef, useState } from "react"
import { copyServerIp } from "@/core/lib/utils"

/**
 * Copies a server address to the clipboard and exposes a short-lived
 * `copied` flag used for the confirmation icon. The reset timer is cleared on
 * unmount so it never updates an unmounted component.
 */
export function useCopyServerIp(ip: string, port: number, type?: string) {
    const [copied, setCopied] = useState(false)
    const timerRef = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (timerRef.current !== null) clearTimeout(timerRef.current)
        }
    }, [])

    const copy = useCallback(() => {
        Promise.resolve()
            .then(() => copyServerIp(ip, port, type))
            .then(() => {
                setCopied(true)
                if (timerRef.current !== null) clearTimeout(timerRef.current)
                timerRef.current = window.setTimeout(() => setCopied(false), 2000)
            })
            .catch(() => {
                // Clipboard access can be denied (insecure context, missing permission).
            })
    }, [ip, port, type])

    return { copied, copy }
}
