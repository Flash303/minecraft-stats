import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ServerList } from "@/pages/ServerList"
import { ServerDetail } from "@/pages/ServerDetail"
import { ServerComparison } from "@/pages/ServerComparison"
import { AdminDashboard } from "@/pages/AdminDashboard"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ServerList />} />
                <Route path="/server/:id" element={<ServerDetail />} />
                <Route path="/compare" element={<ServerComparison />} />
                <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/dashboard/:subview" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
