/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@clerk/react"

interface AdminContextType {
    isAdmin: boolean
    loadingAdmin: boolean
    checkAdmin: () => Promise<boolean>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        )
        return JSON.parse(jsonPayload)
    } catch (e) {
        console.error("Error parsing JWT:", e)
        return null
    }
}

export function AdminProvider({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded, getToken } = useAuth()
    const [isAdmin, setIsAdmin] = useState(false)
    const [loadingAdmin, setLoadingAdmin] = useState(true)

    const checkAdmin = async () => {
        if (!isSignedIn) {
            setIsAdmin(false)
            setLoadingAdmin(false)
            return false
        }
        setLoadingAdmin(true)
        try {
            const token = await getToken()
            if (token) {
                const payload = parseJwt(token)
                const status = payload && (payload.is_admin === true || payload.is_admin === "true" || payload.is_admin === 1)
                setIsAdmin(!!status)
                return !!status
            }
        } catch (error) {
            console.error("Error checking admin status:", error)
        } finally {
            setLoadingAdmin(false)
        }
        setIsAdmin(false)
        return false
    }

    useEffect(() => {
        if (isLoaded) {
            checkAdmin()
        } else {
            setLoadingAdmin(true)
        }
    }, [isSignedIn, isLoaded])

    return (
        <AdminContext.Provider value={{ isAdmin, loadingAdmin, checkAdmin }}>
            {children}
        </AdminContext.Provider>
    )
}

export function useAdmin() {
    const context = useContext(AdminContext)
    if (context === undefined) {
        throw new Error("useAdmin must be used within an AdminProvider")
    }
    return context
}
