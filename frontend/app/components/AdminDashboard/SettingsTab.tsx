import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    AlertTriangle,
    Lock,
    Database,
    RefreshCw,
    Trash2
} from "lucide-react"

interface SettingsTabProps {
    maintenanceMode: boolean
    handleToggleMaintenance: () => void
    rateLimiting: boolean
    handleToggleRateLimit: () => void
    isCleaningDb: boolean
    handleRunDbCleanup: () => void
    t: (key: string) => string
}

export function SettingsTab({
    maintenanceMode,
    handleToggleMaintenance,
    rateLimiting,
    handleToggleRateLimit,
    isCleaningDb,
    handleRunDbCleanup,
    t
}: SettingsTabProps) {
    return (
        <div className="flex flex-col gap-6">
            
            {/* Option 1: Maintenance Mode */}
            <Card className="bg-card border-slate-200/60 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <AlertTriangle className="h-4.5 w-4.5 text-amber-500" />
                                {t("admin.settings.maintenance")}
                            </CardTitle>
                            <CardDescription>{t("admin.settings.maintenanceDesc")}</CardDescription>
                        </div>
                        
                        {/* Styled Toggle Switch */}
                        <button 
                            onClick={handleToggleMaintenance}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                maintenanceMode ? "bg-amber-500" : "bg-slate-200 dark:bg-zinc-800"
                            }`}
                        >
                            <span 
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    maintenanceMode ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </CardHeader>
            </Card>

            {/* Option 2: Rate Limit Switch */}
            <Card className="bg-card border-slate-200/60 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Lock className="h-4.5 w-4.5 text-blue-500" />
                                {t("admin.settings.rateLimit")}
                            </CardTitle>
                            <CardDescription>{t("admin.settings.rateLimitDesc")}</CardDescription>
                        </div>
                        
                        <button 
                            onClick={handleToggleRateLimit}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                rateLimiting ? "bg-primary" : "bg-slate-200 dark:bg-zinc-800"
                            }`}
                        >
                            <span 
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    rateLimiting ? "translate-x-6" : "translate-x-1"
                                }`}
                            />
                        </button>
                    </div>
                </CardHeader>
            </Card>

            {/* Option 3: Manual Database Cleanup */}
            <Card className="bg-card border-slate-200/60 dark:border-zinc-800 shadow-xs">
                <CardHeader className="pb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col gap-1">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Database className="h-4.5 w-4.5 text-indigo-500" />
                                {t("admin.settings.cleanup")}
                            </CardTitle>
                            <CardDescription>{t("admin.settings.cleanupDesc")}</CardDescription>
                        </div>
                        
                        <Button 
                            id="btn-run-cleanup"
                            onClick={handleRunDbCleanup} 
                            disabled={isCleaningDb}
                            variant="outline" 
                            className="gap-2 cursor-pointer"
                        >
                            {isCleaningDb ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                            )}
                            {t("admin.settings.runCleanup")}
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        </div>
    )
}
