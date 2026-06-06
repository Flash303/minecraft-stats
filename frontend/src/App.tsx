import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ServerList } from "@/pages/ServerList"
import { ServerDetail } from "@/pages/ServerDetail"
import { ServerComparison } from "@/pages/ServerComparison"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ServerList />} />
                <Route path="/server/:id" element={<ServerDetail />} />
                <Route path="/compare" element={<ServerComparison />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
