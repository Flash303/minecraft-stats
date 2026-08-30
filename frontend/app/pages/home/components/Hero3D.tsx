import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDown } from "lucide-react"
import { useLanguage } from "@/core/contexts/LanguageContext"
import { useTheme } from "@/core/contexts/ThemeContext"
import type { Server as ServerType } from "@/core/lib/api"
import { resolveToken, withAlpha } from "@/core/lib/theme-colors"

// Predefined heights for the graph nodes (representing server player count stats)
// Canvas is 460x320. Y-axis is inverted in canvas (0 is top, 320 is bottom).
const defaultYValues = [240, 180, 210, 110, 150, 70, 120]

// We will space 7 points evenly along the X-axis
const pointCount = 7
const paddingX = 40
const canvasWidth = 460
const canvasHeight = 320
const bottomY = 270 // baseline for chart area fill

const points = defaultYValues.map((y, idx) => {
    const interval = (canvasWidth - paddingX * 2) / (pointCount - 1)
    return {
        x: paddingX + idx * interval,
        y: y
    }
})

// Animated counter hook (module-level to comply with React rules of hooks)
function useAnimatedCount(target: number, duration = 1200) {
    const [count, setCount] = useState(0)
    useEffect(() => {
        // prefers-reduced-motion : pas d'animation, valeur finale directe
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            setCount(target)
            return
        }
        if (target === 0) { setCount(0); return }
        let start = 0
        const step = target / (duration / 16)
        const timer = setInterval(() => {
            start += step
            if (start >= target) {
                setCount(target)
                clearInterval(timer)
            } else {
                setCount(Math.floor(start))
            }
        }, 16)
        return () => clearInterval(timer)
    }, [target, duration])
    return count
}

export function Hero3D({ servers = [] }: { servers?: ServerType[] }) {
    const { t } = useLanguage()
    const { theme } = useTheme()
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const hoveredPointRef = useRef<number | null>(null)
    const isVisibleRef = useRef<boolean>(true)

    // Mémoïsé : les compteurs animés provoquent ~60 re-renders/s pendant l'intro,
    // il ne faut pas re-filtrer/réduire la liste à chaque frame.
    const { totalServers, onlineServers, totalPlayers } = useMemo(() => {
        const visible = servers.filter(s => s.hidden !== true)
        const online = visible.filter(s => s.last_status === "online")
        return {
            totalServers: visible.length,
            onlineServers: online.length,
            totalPlayers: online.reduce((sum, s) => sum + (s.last_connected ?? 0), 0),
        }
    }, [servers])

    const animatedTotal = useAnimatedCount(totalServers)
    const animatedOnline = useAnimatedCount(onlineServers)
    const animatedPlayers = useAnimatedCount(totalPlayers)

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const canvas = canvasRef.current
        if (!canvas) return
        const rect = canvas.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        let closestIdx: number | null = null
        let minDistance = 25 // activation radius in pixels

        points.forEach((p, idx) => {
            const dx = p.x - mouseX
            const dy = p.y - mouseY
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < minDistance) {
                minDistance = dist
                closestIdx = idx
            }
        })
        hoveredPointRef.current = closestIdx
    }

    const handleMouseLeave = () => {
        hoveredPointRef.current = null
    }

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        // Set dimensions for high-DPI screens
        const dpr = window.devicePixelRatio || 1
        canvas.width = canvasWidth * dpr
        canvas.height = canvasHeight * dpr
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.scale(dpr, dpr)

        let animationFrameId: number
        let running = false

        // Relance la boucle si elle s'est arrêtée (hero hors écran)
        const startLoop = () => {
            if (!running) {
                running = true
                animationFrameId = requestAnimationFrame(render)
            }
        }
        
        // Animation states
        let globalProgress = 0.0 // Goes from 0.0 to 1.15 to allow last point's elastic bounce to finish
        const globalSpeed = 0.007 // Speed of drawing
        let state: "drawing" | "live" | "resetting" = "drawing"
        let liveTimer = 0
        let resetAlpha = 1.0
        let liveTransition = 0.0 // Fades from 0 to 1 to transition to swaying smoothly

        // Dynamic slight vertical sway for "live" state
        const sways = new Array(pointCount).fill(0).map(() => Math.random() * Math.PI * 2)

        // Easing curves
        const easeInOutCubic = (x: number): number => {
            return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
        }

        const easeOutElastic = (x: number): number => {
            const c4 = (2 * Math.PI) / 3
            return x === 0
                ? 0
                : x === 1
                ? 1
                : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1
        }

        // Trigger times in globalProgress space for each of the 7 points
        const rawTriggers = [0.0, 0.16, 0.33, 0.5, 0.67, 0.83, 1.0]

        const getPointScale = (i: number, progress: number) => {
            const trigger = rawTriggers[i]
            const d = progress - trigger
            if (d < 0) return 0
            
            const duration = 0.12 // duration of the bounce in progress units
            const factor = Math.min(1, d / duration)
            return easeOutElastic(factor)
        }

        const render = () => {
            if (!isVisibleRef.current) {
                // Hors écran : on arrête la boucle ; l'IntersectionObserver
                // relancera le rendu quand le hero redeviendra visible.
                running = false
                return
            }

            ctx.clearRect(0, 0, canvasWidth, canvasHeight)

            const isDark = theme === "dark"
            
            // Grid and label colors
            const gridColor = withAlpha(resolveToken("--border"), isDark ? 0.5 : 0.6)
            const labelColor = resolveToken("--muted-foreground")
            const primaryColor = resolveToken("--primary")
            const primaryGlow = withAlpha(primaryColor, isDark ? 0.3 : 0.2)
            const areaGradientStart = withAlpha(primaryColor, isDark ? 0.12 : 0.08)

            // 1. Draw Grid Lines
            ctx.strokeStyle = gridColor
            ctx.lineWidth = 1
            ctx.fillStyle = labelColor
            ctx.font = "bold 9px monospace"
            
            const gridRows = [70, 120, 170, 220, 270]
            const gridLabels = ["50k", "40k", "30k", "20k", "10k"]
            
            gridRows.forEach((rowY, idx) => {
                ctx.beginPath()
                ctx.moveTo(30, rowY)
                ctx.lineTo(canvasWidth - 30, rowY)
                ctx.stroke()
                
                // Draw Y-axis labels
                ctx.fillText(gridLabels[idx], 10, rowY + 3)
            })

            // 2. Animation state updates
            let currentPoints = points.map(p => ({ ...p }))

            if (state === "drawing") {
                globalProgress += globalSpeed
                if (globalProgress >= 1.15) { // 1.15 to allow the last point's bounce to complete
                    state = "live"
                    liveTimer = 0
                    liveTransition = 0.0
                }
            } else if (state === "live") {
                liveTimer++
                if (liveTransition < 1.0) {
                    liveTransition += 0.05 // transition smoothly into live swaying
                }
                
                // Add soft wave sways to simulate live stream fluctuations
                currentPoints = points.map((p, idx) => {
                    sways[idx] += 0.02
                    const offset = Math.sin(sways[idx]) * 4 * liveTransition
                    return {
                        x: p.x,
                        y: p.y + offset
                    }
                })
                
                // Stay in live state for ~400 frames (~6.5s) before cycling/resetting
                if (liveTimer > 400) {
                    state = "resetting"
                    resetAlpha = 1.0
                }
            } else if (state === "resetting") {
                resetAlpha -= 0.04
                if (resetAlpha <= 0) {
                    // Reset to initial drawing state
                    state = "drawing"
                    globalProgress = 0.0
                    resetAlpha = 1.0
                }
            }

            // Apply global opacity filter in resetting fade phase
            const currentGlobalAlpha = ctx.globalAlpha
            if (state === "resetting") {
                ctx.globalAlpha = Math.max(0, resetAlpha)
            }

            // Calculate current drawing progress and cursor position
            const easedT = easeInOutCubic(Math.min(1, globalProgress))

            let drawX: number
            let drawY: number

            if (state === "drawing") {
                const totalSegments = pointCount - 1
                const currentSegmentDecimal = easedT * totalSegments
                const activeIndex = Math.floor(currentSegmentDecimal)
                const segmentT = currentSegmentDecimal - activeIndex

                if (activeIndex >= totalSegments) {
                    drawX = currentPoints[totalSegments].x
                    drawY = currentPoints[totalSegments].y
                } else {
                    const pStart = currentPoints[activeIndex]
                    const pEnd = currentPoints[activeIndex + 1]
                    drawX = pStart.x + (pEnd.x - pStart.x) * segmentT
                    drawY = pStart.y + (pEnd.y - pStart.y) * segmentT
                }
            } else {
                drawX = currentPoints[pointCount - 1].x
                drawY = currentPoints[pointCount - 1].y
            }

            // 3. Draw Translucent Area Fill Under Path
            ctx.beginPath()
            ctx.moveTo(currentPoints[0].x, bottomY)
            ctx.lineTo(currentPoints[0].x, currentPoints[0].y)

            const activeIndex = state === "drawing" ? Math.floor(easedT * (pointCount - 1)) : pointCount - 1
            for (let i = 0; i < activeIndex; i++) {
                ctx.lineTo(currentPoints[i + 1].x, currentPoints[i + 1].y)
            }

            if (state === "drawing" && easedT < 1.0) {
                ctx.lineTo(drawX, drawY)
            }

            ctx.lineTo(drawX, bottomY)
            ctx.closePath()

            const areaGrad = ctx.createLinearGradient(0, 70, 0, bottomY)
            areaGrad.addColorStop(0, areaGradientStart)
            areaGrad.addColorStop(1, withAlpha(primaryColor, 0))
            ctx.fillStyle = areaGrad
            ctx.fill()

            // 4. Draw Stroke Chart Line
            ctx.beginPath()
            ctx.moveTo(currentPoints[0].x, currentPoints[0].y)
            
            for (let i = 0; i < activeIndex; i++) {
                ctx.lineTo(currentPoints[i + 1].x, currentPoints[i + 1].y)
            }

            if (state === "drawing" && easedT < 1.0) {
                ctx.lineTo(drawX, drawY)
            }

            ctx.strokeStyle = primaryColor
            ctx.lineWidth = 3
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.stroke()

            // 5. Draw Glowing Tracer Cursor (Active draw point)
            if (state === "drawing" && easedT < 1.0) {
                // Outer glow aura (pulsing)
                const pulseScale = 1 + Math.sin(globalProgress * 30) * 0.15
                ctx.beginPath()
                ctx.arc(drawX, drawY, 8 * pulseScale, 0, Math.PI * 2)
                ctx.fillStyle = primaryGlow
                ctx.fill()

                // Core dot
                ctx.beginPath()
                ctx.arc(drawX, drawY, 3.5, 0, Math.PI * 2)
                ctx.fillStyle = isDark ? resolveToken("--foreground") : primaryColor
                ctx.fill()
            }

            // 6. Draw Nodes (Points) with elastic pop-in scale
            for (let i = 0; i < pointCount; i++) {
                const p = currentPoints[i]
                
                // Get the scale of the node
                const nodeScale = state === "drawing" ? getPointScale(i, globalProgress) : 1.0
                if (nodeScale <= 0) continue

                const isHovered = hoveredPointRef.current === i
                const baseDotRadius = isHovered ? 6 : 4.5
                const baseRingRadius = isHovered ? 12 : 9
                
                const dotRadius = baseDotRadius * nodeScale
                const ringRadius = baseRingRadius * nodeScale

                // Draw outer ring
                ctx.beginPath()
                ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2)
                ctx.fillStyle = isHovered ? primaryGlow : withAlpha(primaryColor, isDark ? 0.1 : 0.06)
                ctx.fill()

                // Draw core border
                ctx.beginPath()
                ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2)
                ctx.strokeStyle = primaryColor
                ctx.lineWidth = 2 * nodeScale
                ctx.fillStyle = resolveToken("--card")
                ctx.fill()
                ctx.stroke()
            }

            // Reset alpha back
            ctx.globalAlpha = currentGlobalAlpha

            animationFrameId = requestAnimationFrame(render)
        }

        // Pause/reprend l'animation selon la visibilité du hero
        const observer = new IntersectionObserver(
            ([entry]) => {
                isVisibleRef.current = entry.isIntersecting
                if (entry.isIntersecting) startLoop()
            },
            { threshold: 0 }
        )
        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        startLoop()

        return () => {
            observer.disconnect()
            cancelAnimationFrame(animationFrameId)
            running = false
        }
    }, [theme])

    const handleScrollDown = () => {
        const target = document.getElementById("server-list-section")
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    return (
        <div className="relative min-h-[58vh] flex flex-col items-center justify-center overflow-hidden py-12 px-4 border-b border-border/40">
            {/* Ambient Background Grid Glows */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-primary/10 blur-3xl -z-10" />
            
            <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-between gap-16 z-10">
                {/* Hero Text */}
                <div className="flex-1 text-center lg:text-left space-y-6 max-w-xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                        {t("hero.title1")} <span className="text-primary font-black">{t("hero.title2")}</span>
                    </h1>
                    
                    <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                        {t("hero.description")}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                        <button
                            onClick={handleScrollDown}
                            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-300 shadow-xs hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer text-xs"
                        >
                            {t("hero.cta")}
                            <ArrowDown className="h-4 w-4 animate-bounce" />
                        </button>
                    </div>

                    {/* Stats Row */}
                    <div className="flex flex-col gap-4 pt-6 pb-2">
                        <div className="flex items-center justify-center lg:justify-start gap-5 sm:gap-8">
                            <div className="flex flex-col items-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums flex items-baseline">
                                    {animatedTotal.toLocaleString()}<span className="text-info text-xl sm:text-2xl font-extrabold">+</span>
                                </p>
                                <p className="text-xs sm:text-xs text-muted-foreground mt-0.5 font-medium">
                                    {t("hero.stats.servers")}
                                </p>
                            </div>
                            
                            <div className="w-[1px] h-8 bg-border/60"></div>
                            
                            <div className="flex flex-col items-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                                    {animatedOnline.toLocaleString()}
                                </p>
                                <p className="text-xs sm:text-xs text-muted-foreground mt-0.5 font-medium">
                                    {t("hero.stats.online")}
                                </p>
                            </div>

                            <div className="w-[1px] h-8 bg-border/60"></div>
                            
                            <div className="flex flex-col items-center">
                                <p className="text-2xl sm:text-3xl font-extrabold text-foreground tabular-nums">
                                    {animatedPlayers.toLocaleString()}
                                </p>
                                <p className="text-xs sm:text-xs text-muted-foreground mt-0.5 font-medium">
                                    {t("hero.stats.players")}
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-center lg:items-start pl-0 lg:pl-1 mt-1">
                            <div className="flex items-center gap-2">
                                <div className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-info opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-info"></span>
                                </div>
                                <span className="text-foreground font-bold text-xs tracking-wide">Live</span>
                            </div>
                        </div>
                    </div>

                </div>


                {/* 2D Animated Chart Canvas Area */}
            <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="flex flex-shrink-0 w-full max-w-[460px] aspect-[460/320] items-center justify-center relative bg-card rounded-3xl border border-border/60 shadow-lg shadow-primary/5 dark:shadow-none overflow-hidden"
            >
                <canvas 
                    ref={canvasRef} 
                    aria-hidden="true"
                    style={{
                        width: "100%",
                        height: "100%",
                        display: "block",
                    }}
                />
            </div>
            </div>
        </div>
    )
}
