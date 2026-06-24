import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "./contexts/ThemeContext"
import { SearchProvider } from "./contexts/SearchContext"
import { LanguageProvider } from "./contexts/LanguageContext"
import { ClerkProvider } from "@clerk/react"

import { AdminProvider } from "./contexts/AdminContext"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
            <AdminProvider>
                <ThemeProvider>
                    <LanguageProvider>
                        <SearchProvider>
                            <App />
                        </SearchProvider>
                    </LanguageProvider>
                </ThemeProvider>
            </AdminProvider>
        </ClerkProvider>
    </StrictMode>
)

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js")
            .then(reg => console.log("Service Worker registered successfully:", reg.scope))
            .catch(err => console.error("Service Worker registration failed:", err));
    });
}

