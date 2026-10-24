import { Outlet } from "react-router"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { DocumentMetaSync } from "./DocumentMetaSync"

export default function Layout() {
    return (
        <>
            <DocumentMetaSync />
            {/* `min-h-dvh` keeps the footer at the bottom on mobile browsers
                whose toolbar changes the visible viewport height. */}
            <div className="flex min-h-dvh flex-col">
                <Header />
                {/* Pages own their horizontal gutters (PageContainer) so that
                    full-bleed sections (hero, banners) can span the viewport. */}
                <main id="main-content" className="flex-1">
                    <Outlet />
                </main>
                <Footer />
            </div>
        </>
    )
}
