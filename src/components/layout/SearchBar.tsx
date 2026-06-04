import { Search as SearchIcon, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    placeholder?: string
}

export function SearchBar({ value, onChange, placeholder = "Rechercher un serveur..." }: SearchBarProps) {
    return (
        <div className="relative w-full max-w-sm group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                <SearchIcon className="h-4 w-4" />
            </div>
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="pl-9 pr-9 h-9 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-primary/50 transition-all"
            />
            {value && (
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-transparent text-muted-foreground hover:text-foreground"
                    onClick={() => onChange("")}
                >
                    <X className="h-3 w-3" />
                </Button>
            )}
        </div>
    )
}
