import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ServerList } from "@/pages/ServerList"
import { ServerDetail } from "@/pages/ServerDetail"
import { ServerComparison } from "@/pages/ServerComparison"
import { AdminDashboard } from "@/pages/AdminDashboard"
import { Account } from "@/pages/Account"
import { Terms } from "@/pages/Terms"
import { Privacy } from "@/pages/Privacy"
import { Layout } from "@/components/layout"
import { ScrollToTop } from "@/components/ScrollToTop"


function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<ServerList />} />
                    <Route path="/server/:id" element={<ServerDetail />} />
                    <Route path="/compare" element={<ServerComparison />} />
                    <Route path="/account/*" element={<Account />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/privacy" element={<Privacy />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>

                <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/dashboard/:subview" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
