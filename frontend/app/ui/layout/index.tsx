import { useState } from "react"
import type { ReactNode } from "react"
import { Outlet } from "react-router"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { LayoutContext } from "./LayoutContext"

export default function Layout() {
    const [leftContent, setLeftContent] = useState<ReactNode | undefined>()

    return (
        <LayoutContext.Provider value={{ setLeftContent }}>
            <div className="flex min-h-screen flex-col">
                <Header leftContent={leftContent} />
                <main className="container mx-auto flex-1 px-4 py-6">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </LayoutContext.Provider>
    )
}
export * from "./LayoutContext"
