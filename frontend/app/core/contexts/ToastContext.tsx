import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { useLanguage } from "./LanguageContext"

type ToastType = "success" | "warning" | "error"

interface ToastItem {
    id: number
    type: ToastType
    text: string
}

interface ToastContextValue {
    showToast: (type: ToastType, text: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TOAST_DURATION_MS = 5000
const MAX_VISIBLE_TOASTS = 3

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const { t } = useLanguage()
    const [toasts, setToasts] = useState<ToastItem[]>([])
    const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

    useEffect(() => () => {
        timers.current.forEach(timer => clearTimeout(timer))
        timers.current.clear()
    }, [])

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
        const timer = timers.current.get(id)
        if (timer) {
            clearTimeout(timer)
            timers.current.delete(id)
        }
    }, [])

    const showToast = useCallback((type: ToastType, text: string) => {
        const id = Date.now() + Math.random()
        setToasts(prev => [...prev.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, type, text }])
        timers.current.set(id, setTimeout(() => dismiss(id), TOAST_DURATION_MS))
    }, [dismiss])

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed top-20 right-0 sm:right-4 z-[100] flex flex-col gap-2 w-full max-w-sm px-4 sm:px-0 pointer-events-none">
                {toasts.map(toast => {
                    const Icon = toast.type === "success"
                        ? CheckCircle2
                        : toast.type === "warning"
                            ? AlertTriangle
                            : XCircle
                    const titleKey = toast.type === "success"
                        ? "toast.successTitle"
                        : toast.type === "warning"
                            ? "toast.warningTitle"
                            : "toast.errorTitle"

                    return (
                        <div
                            key={toast.id}
                            role="status"
                            aria-live="polite"
                            className={cn(
                                "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-300",
                                toast.type === "success" && "bg-success/10 border-success/20 text-success",
                                toast.type === "warning" && "bg-warning/10 border-warning/20 text-warning",
                                toast.type === "error" && "bg-destructive/10 border-destructive/20 text-destructive"
                            )}
                        >
                            <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider">{t(titleKey)}</p>
                                <p className="text-sm mt-0.5 font-medium break-words text-foreground">{toast.text}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => dismiss(toast.id)}
                                aria-label={t("toast.close")}
                                className="mt-0.5 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer transition-colors flex-shrink-0"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )
                })}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) {
        throw new Error("useToast must be used within a ToastProvider")
    }
    return ctx
}
