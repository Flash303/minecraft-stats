import { useState, useEffect, useRef } from "react"
import { ArrowDown } from "lucide-react"
import { useLanguage } from "@/contexts/LanguageContext"

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

export function Hero3D() {
    const { t } = useLanguage()
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const hoveredPointRef = useRef<number | null>(null)

    // Track mouse hover to highlight nodes
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
        ctx.scale(dpr, dpr)

        let animationFrameId: number
        
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
            ctx.clearRect(0, 0, canvasWidth, canvasHeight)

            const isDark = document.documentElement.classList.contains("dark")
            
            // Grid and label colors
            const gridColor = isDark ? "rgba(39, 39, 42, 0.5)" : "rgba(228, 228, 231, 0.6)"
            const labelColor = isDark ? "#52525b" : "#a1a1aa"
            const primaryColor = isDark ? "rgb(129, 140, 248)" : "rgb(79, 70, 229)"
            const primaryGlow = isDark ? "rgba(129, 140, 248, 0.3)" : "rgba(79, 70, 229, 0.2)"
            const areaGradientStart = isDark ? "rgba(129, 140, 248, 0.12)" : "rgba(79, 70, 229, 0.08)"

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
            areaGrad.addColorStop(1, "rgba(99, 102, 241, 0.0)")
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
                ctx.fillStyle = isDark ? "#ffffff" : primaryColor
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
                ctx.fillStyle = isHovered ? primaryGlow : (isDark ? "rgba(129, 140, 248, 0.1)" : "rgba(79, 70, 229, 0.06)")
                ctx.fill()

                // Draw core border
                ctx.beginPath()
                ctx.arc(p.x, p.y, dotRadius, 0, Math.PI * 2)
                ctx.strokeStyle = primaryColor
                ctx.lineWidth = 2 * nodeScale
                ctx.fillStyle = isDark ? "#18181b" : "#ffffff"
                ctx.fill()
                ctx.stroke()
            }

            // Reset alpha back
            ctx.globalAlpha = currentGlobalAlpha

            animationFrameId = requestAnimationFrame(render)
        }

        render()

        return () => {
            cancelAnimationFrame(animationFrameId)
        }
    }, [])

    const handleScrollDown = () => {
        const target = document.getElementById("server-list-section")
        if (target) {
            target.scrollIntoView({ behavior: "smooth", block: "start" })
        }
    }

    return (
        <div className="relative min-h-[58vh] flex flex-col items-center justify-center overflow-hidden py-12 px-4 select-none border-b border-slate-200/40 dark:border-zinc-800/10">
            {/* Ambient Background Grid Glows */}
            <div className="absolute top-1/4 left-1/4 w-80 h-80 rounded-full bg-slate-200/20 dark:bg-zinc-800/5 blur-3xl -z-10" />
            
            <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-between gap-16 z-10">
                {/* Hero Text */}
                <div className="flex-1 text-center lg:text-left space-y-6 max-w-xl">
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-zinc-100 leading-tight">
                        {t("hero.title1")} <span className="text-slate-900 dark:text-white font-black">{t("hero.title2")}</span>
                    </h1>
                    
                    <p className="text-slate-500 dark:text-zinc-400 text-sm sm:text-base leading-relaxed">
                        {t("hero.description")}
                    </p>
                    
                    <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                        <button
                            onClick={handleScrollDown}
                            className="h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-semibold transition-all duration-300 shadow-xs hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer text-xs"
                        >
                            {t("hero.cta")}
                            <ArrowDown className="h-4 w-4 animate-bounce" />
                        </button>
                    </div>
                </div>

                {/* 2D Animated Chart Canvas Area */}
                <div 
                    ref={containerRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    className="hidden sm:flex flex-shrink-0 w-[460px] h-[320px] items-center justify-center relative bg-white dark:bg-zinc-950 rounded-3xl border border-slate-200/60 dark:border-zinc-800/60 shadow-lg shadow-slate-100/5 dark:shadow-none overflow-hidden"
                >
                    <canvas 
                        ref={canvasRef} 
                        style={{
                            width: "460px",
                            height: "320px",
                            display: "block",
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
