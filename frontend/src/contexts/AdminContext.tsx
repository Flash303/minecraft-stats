/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useAuth } from "@clerk/react"
import { checkAdminStatus } from "@/lib/api"

interface AdminContextType {
    isAdmin: boolean
    loadingAdmin: boolean
    checkAdmin: () => Promise<boolean>
}

const AdminContext = createContext<AdminContextType | undefined>(undefined)

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
                const status = await checkAdminStatus(token)
                setIsAdmin(status)
                return status
            }
        } catch (error) {
            console.error("Error checking admin status:", error)
        } finally {
            setLoadingAdmin(false)
        }
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
