import type { Server } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

import default_icon from "@/assets/default_favicon.svg";

interface ServerCardProps {
    server: Server
    onClick: (server: Server) => void
}

export function ServerCard({ server, onClick }: ServerCardProps) {
    return (
        <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => onClick(server)}
        >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
                {server.last_favicon ? (
                    <img
                        src={server.last_favicon}
                        alt=""
                        className="h-8 w-8 rounded"
                    />
                ) : (
                    <img
                        src={default_icon}
                        alt=""
                        className="h-8 w-8 rounded"
                    />
                )}
                <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base">
                        {server.name}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-sm">
                    {server.ip}:{server.port}
                </p>
            </CardContent>
        </Card>
    )
}
