import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { ServerList } from "@/pages/ServerList"
import { ServerDetail } from "@/pages/ServerDetail"

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<ServerList />} />
                <Route path="/server/:id" element={<ServerDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
