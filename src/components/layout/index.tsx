import { Header } from "./Header"

interface LayoutProps {
    children: React.ReactNode
    onRefresh?: () => void
    isLoading?: boolean
    leftContent?: React.ReactNode
}

export function Layout({ children, onRefresh, isLoading, leftContent }: LayoutProps) {
    return (
        <div className="flex min-h-screen flex-col">
            <Header 
                onRefresh={onRefresh} 
                isLoading={isLoading} 
                leftContent={leftContent}
            />
            <main className="container mx-auto flex-1 px-4 py-6">
                {children}
            </main>
        </div>
    )
}
