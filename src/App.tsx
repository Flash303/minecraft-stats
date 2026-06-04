import { useState } from "react"
import { ServerList } from "@/components/ServerList"
import { ServerDetail } from "@/components/ServerDetail"
import type { Server } from "@/lib/api"

function App() {
    const [selectedServer, setSelectedServer] = useState<Server | null>(null)

    return (
        <>
            {selectedServer ? (
                <ServerDetail
                    server={selectedServer}
                    onBack={() => setSelectedServer(null)}
                />
            ) : (
                <ServerList onSelectServer={setSelectedServer} />
            )}
        </>
    )
}

export default App
