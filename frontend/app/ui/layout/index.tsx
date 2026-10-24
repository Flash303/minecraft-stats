import { Outlet } from "react-router"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { DocumentMetaSync } from "./DocumentMetaSync"

export default function Layout() {
    return (
        <>
            <DocumentMetaSync />
            <div className="flex min-h-screen flex-col">
                <Header />
                <main className="container mx-auto flex-1 px-4 py-6">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </>
    )
}
