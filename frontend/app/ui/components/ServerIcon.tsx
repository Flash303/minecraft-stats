import React from "react"
import { getServerIconUrl } from "@/core/lib/api"
import default_icon from "@/assets/default_favicon.svg"

interface ServerIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    serverId: number | string
}

export function ServerIcon({ serverId, alt = "", className, ...props }: ServerIconProps) {
    return (
        <img
            src={getServerIconUrl(serverId)}
            onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = default_icon;
            }}
            alt={alt}
            className={className}
            {...props}
        />
    )
}
