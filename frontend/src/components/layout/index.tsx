import { useState } from "react"
import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { LayoutContext } from "./LayoutContext"

export function Layout() {
    const [onRefreshFn, setOnRefreshFn] = useState<{ fn?: () => void }>({})
    const [isLoading, setIsLoading] = useState<boolean | undefined>()
    const [leftContent, setLeftContent] = useState<ReactNode | undefined>()

    const setOnRefresh = (fn: (() => void) | undefined) => setOnRefreshFn({ fn })

    return (
        <LayoutContext.Provider value={{ setOnRefresh, setIsLoading, setLeftContent }}>
            <div className="flex min-h-screen flex-col">
                <Header 
                    onRefresh={onRefreshFn.fn} 
                    isLoading={isLoading} 
                    leftContent={leftContent}
                />
                <main className="container mx-auto flex-1 px-4 py-6">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </LayoutContext.Provider>
    )
}
export * from "./LayoutContext"
