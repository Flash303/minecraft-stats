import { useState, useEffect, useMemo, useRef, lazy, Suspense } from "react"
import { useParams, Link, useLoaderData, useRouteError } from "react-router"
import type { LoaderFunctionArgs, MetaFunction } from "react-router"
import { fetchRecords, fetchServer, getServerIconUrl } from "@/core/lib/api"
import type { Server } from "@/core/lib/api"
const PlayerChart = lazy(() =>
    import("@/pages/server-detail/components/PlayerChart").then((m) => ({
        default: m.PlayerChart
    }))
)
import { ServerDetailHeader } from "@/pages/server-detail/components/ServerDetailHeader"
import { TimeIntervalSelector } from "@/pages/server-detail/components/TimeIntervalSelector"
import { StatsSection } from "@/pages/server-detail/components/StatsSection"
import { AlertsSection } from "@/pages/server-detail/components/AlertsSection"
import { Button } from "@/ui/components/button"
import { BarChart } from "lucide-react"

import { useAuth } from "@clerk/react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { getTimeRanges, getIntervals } from "@/core/lib/chartUtils"
import { cn, formatMinecraftVersion } from "@/core/lib/utils"

import { MinecraftMotd } from "@/ui/motd"
import {
    getLabyModServerInfo,
    type LabyModServer
} from "@/core/lib/labymod"
import {
    getLunarServerInfo,
    type LunarServer
} from "@/core/lib/lunar"
import { ServerSidebar } from "@/pages/server-detail/components/ServerSidebar"
import { useServerData } from "./hooks/useServerData"

export type DateRange = {
    from: Date | undefined
    to?: Date | undefined
}

export async function loader({ request, params }: LoaderFunctionArgs) {
    if (!params.id)
        return {
            initialServer: null,
            initialRecords: [],
            initialFrom: Infinity
        }
    try {
        const id = Number(params.id)
        const forwardedFor =
            request.headers.get("x-forwarded-for") ||
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-real-ip")
        const server = await fetchServer(id, undefined, forwardedFor)

        return {
            initialServer: server,
            initialRecords: [],
            initialFrom: Infinity
        }
    } catch {
        return {
            initialServer: null,
            initialRecords: [],
            initialFrom: Infinity
        }
    }
}

export async function clientLoader({ params }: any) {
    if (!params.id)
        return {
            initialServer: null,
            initialRecords: [],
            initialFrom: Infinity
        }
    try {
        const id = Number(params.id)
        // Fetch directement depuis le client, plus de requête _.data
        const server = await fetchServer(id)

        return {
            initialServer: server,
            initialRecords: [],
            initialFrom: Infinity
        }
    } catch {
        return {
            initialServer: null,
            initialRecords: [],
            initialFrom: Infinity
        }
    }
}

export const meta: MetaFunction<typeof loader> = (args) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { loaderData: data } = args as any

    if (!data || !data.initialServer) {
        return [
            { title: "Server Not Found | Minecraft-Stats" },
            { name: "description", content: "Minecraft server not found." }
        ]
    }
    const server = data.initialServer
    const title = `${server.name} - Minecraft Server Stats | Minecraft-Stats`
    const isOnline = server.last_status === "online"
    const players = isOnline
        ? new Intl.NumberFormat("en-US").format(server.last_connected ?? 0)
        : 0
    const playersText = isOnline
        ? ` 🟢 Online: ${players} players.`
        : server.last_status === "offline"
          ? ` 🔴 Offline.`
          : ""
    const description = `View player count, uptime, and stats for ${server.name} (${server.ip}).${playersText}`
    return [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        {
            property: "og:image",
            content: `https://mc-stats.fr/api/favicon/${server.id}`
        },
        { property: "twitter:card", content: "summary_large_image" },
        { property: "twitter:title", content: title },
        { property: "twitter:description", content: description },
        {
            property: "twitter:image",
            content: `https://mc-stats.fr/api/favicon/${server.id}`
        }
    ]
}

export default function ServerDetail() {
    const { t, language } = useLanguage()
    const { id } = useParams<{ id: string }>()
    const { getToken, isSignedIn, isLoaded } = useAuth()

    const loaderData = useLoaderData<typeof loader>()
    const { initialServer, initialRecords, initialFrom } = loaderData || {}
    const {
        server, loading, loadingRecords, records, rawRecords,
        selectedRange, setSelectedRange,
        selectedInterval, setSelectedInterval,
        customRange, setCustomRange,
        appliedRange, appliedInterval, appliedCustomRange,
        timeLimits, visibleRange, setVisibleRange,
        isChartZoomed,
        labyServerInfo, labyManifest, lunarServerInfo,
        backgroundUrl, labyBackground, isRateLimited
    } = useServerData(initialServer, initialRecords, initialFrom);
    const TIME_RANGES = useMemo(() => getTimeRanges(t), [t])
    const INTERVALS = useMemo(() => getIntervals(t), [t])


    useEffect(() => {
        if (!server) return
        const script = document.createElement("script")
        script.type = "application/ld+json"
        script.id = "schema-server-detail"

        const schema = {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: server.name,
            applicationCategory: "GameApplication",
            operatingSystem: server.type === "java" ? "Java" : "Bedrock",
            url: window.location.href,
            image: `https://mc-stats.fr/api/favicon/${server.id}`
        }

        script.innerHTML = JSON.stringify(schema)
        document.head.appendChild(script)

        return () => {
            const existingScript = document.getElementById(
                "schema-server-detail"
            )
            if (existingScript) existingScript.remove()
        }
    }, [server])

    const stats = useMemo(() => {
        if (records.length === 0) return null
        let max = -Infinity
        let min = Infinity
        let sum = 0
        let count = 0

        const minTime = visibleRange ? visibleRange.min : 0
        const maxTime = visibleRange ? visibleRange.max : Infinity

        for (let i = 0; i < records.length; i++) {
            const r = records[i]
            const t = r.date > 1000000000000 ? r.date / 1000 : r.date

            if (t >= minTime && t <= maxTime) {
                const val = r.value
                if (val > max) max = val
                if (val < min) min = val
                sum += val
                count++
            }
        }

        if (count === 0) return null
        const avg = Math.round(sum / count)
        return { max, min, avg }
    }, [records, visibleRange])

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-muted-foreground animate-pulse">
                    {t("serverDetail.loading")}
                </p>
            </div>
        )
    }

    if (!server) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4">
                <p className="text-destructive font-semibold">
                    {t("serverDetail.notFound")}
                </p>
                <Link to={"/"}>
                    <Button>{t("common.backToHome")}</Button>
                </Link>
            </div>
        )
    }

    const isOnline = server.last_status === "online"
    const locale = language === "fr" ? "fr-FR" : "en-US"

    const isCustomRangeIncomplete =
        selectedRange === -1 && (!customRange?.from || !customRange?.to)
    const isPending =
        selectedRange !== appliedRange ||
        selectedInterval !== appliedInterval ||
        (selectedRange === -1 &&
            (customRange?.from?.getTime() !==
                appliedCustomRange?.from?.getTime() ||
                customRange?.to?.getTime() !==
                    appliedCustomRange?.to?.getTime()))

    return (
        <>
            {labyBackground && (
                <div 
                    className="absolute inset-x-0 top-0 h-[50vh] pointer-events-none opacity-30 dark:opacity-20 z-0"
                    style={{
                        backgroundImage: `url(${labyBackground})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        maskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 100%)'
                    }}
                />
            )}
            <div className="flex flex-col gap-8 pb-12 relative z-10">
                <div className="flex flex-col gap-6 border-b pb-6">
                    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <ServerDetailHeader
                            server={server}
                            t={t}
                            locale={locale}
                            lunarInfo={lunarServerInfo}
                            labyInfo={labyServerInfo}
                        />
                    </div>
                </div>

                <div className="flex w-full flex-col gap-8">
                    <div className="mt-[-1rem] hidden w-full justify-center md:flex">
                        <div className="w-fit overflow-hidden rounded-md shadow-xl">
                            <MinecraftMotd
                                motd={server.last_motd}
                                serverName={server.name}
                                currentPlayers={
                                    server.last_protocol_version != null &&
                                    server.last_protocol_version <= 0
                                        ? formatMinecraftVersion(
                                              server.last_version,
                                              false
                                          ) || "Version"
                                        : (server.last_connected ?? 0)
                                }
                                maxPlayers={
                                    server.max_players ??
                                    server.last_max_players ??
                                    20
                                }
                                favicon={getServerIconUrl(server.id)}
                                pingTime={server.last_ping_time}
                                lastSample={server.last_sample}
                                backgroundUrl={backgroundUrl}
                            />
                        </div>
                    </div>

                    <div className="relative flex min-h-[340px] w-full items-center justify-center sm:min-h-[500px]">
                        {(loadingRecords || isPending) && (
                            <div className="bg-background/60 absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl backdrop-blur-[2px] transition-all duration-200">
                                {isCustomRangeIncomplete ? (
                                    <p className="text-muted-foreground text-sm font-medium">
                                        {t("serverDetail.selectCustomRange")}
                                    </p>
                                ) : (
                                    <>
                                        <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
                                        <p className="text-muted-foreground animate-pulse text-sm font-medium">
                                            {t("serverDetail.chartLoading")}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                        <div
                            className={cn(
                                "w-full transition-opacity duration-200",
                                loadingRecords || isPending
                                    ? "pointer-events-none opacity-30 [&_.hide-on-load]:opacity-0"
                                    : "opacity-100"
                            )}
                        >
                            <Suspense
                                fallback={
                                    <div className="flex min-h-[340px] w-full items-center justify-center sm:min-h-[500px]"></div>
                                }
                            >
                                <PlayerChart
                                    data={records}
                                    serverName={server.name}
                                    interval={appliedInterval}
                                    timeRange={timeLimits}
                                    isRateLimited={isRateLimited}
                                    zoomResetId={`${selectedRange}-${customRange?.from?.getTime()}-${customRange?.to?.getTime()}`}
                                    onVisibleRangeChange={(min, max) =>
                                        setVisibleRange({ min, max })
                                    }
                                    onZoomChange={(z) => {
                                        // eslint-disable-next-line react-hooks/immutability
                                        isChartZoomed.current = z;
                                    }}
                                    timeSelector={
                                        <TimeIntervalSelector
                                            selectedRange={selectedRange}
                                            setSelectedRange={setSelectedRange}
                                            selectedInterval={selectedInterval}
                                            setSelectedInterval={setSelectedInterval}
                                            customRange={customRange}
                                            setCustomRange={setCustomRange}
                                            timeRanges={TIME_RANGES}
                                            intervals={INTERVALS}
                                            containerClassName="w-full lg:w-auto"
                                            t={t}
                                        />
                                    }
                                    header={
                                        <h2 className="flex w-full flex-col gap-1 text-lg font-semibold sm:flex-row sm:items-center sm:gap-2">
                                            <div className="flex items-center gap-2 truncate">
                                                <BarChart className="text-primary h-5 w-5 shrink-0" />
                                                <span className="truncate">
                                                    {t(
                                                        "serverDetail.playerHistory"
                                                    )}
                                                </span>
                                            </div>
                                            {isOnline && (
                                                <span className="text-muted-foreground text-sm font-normal sm:whitespace-nowrap">
                                                    (
                                                    {new Intl.NumberFormat(
                                                        locale
                                                    ).format(
                                                        server.last_connected ??
                                                            0
                                                    )}{" "}
                                                    {t("common.currentPlayers")}
                                                    )
                                                </span>
                                            )}
                                        </h2>
                                    }
                                />
                            </Suspense>
                        </div>
                    </div>

                    <div className="flex flex-col gap-8 lg:flex-row">
                        <div className="flex w-full min-w-0 flex-col gap-8">
                            {stats && (
                                <StatsSection
                                    stats={stats}
                                    locale={locale}
                                    t={t}
                                />
                            )}
                            <AlertsSection serverId={server.id} t={t} />
                        </div>

                        {/* Sidebar */}
                        <ServerSidebar
                            labyServerInfo={labyServerInfo}
                            labyManifest={labyManifest}
                            lunarServerInfo={lunarServerInfo}
                            serverName={server.name}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export function ErrorBoundary() {
    const error = useRouteError()
    const { t } = useLanguage()
    console.error("[SSR Debug] ErrorBoundary caught in ServerDetail:", error)
    return (
        <div className="p-8 text-center text-red-500">
            <h1>{t("error.somethingWentWrong")} in ServerDetail</h1>
            <pre className="bg-muted mt-4 overflow-auto rounded p-4 text-left">
                {error instanceof Error ? error.stack : String(error)}
            </pre>
        </div>
    )
}
