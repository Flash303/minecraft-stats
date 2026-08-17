import { useState, useMemo } from 'react';
import type { Server, User } from "@/core/lib/api";

interface UseServersFilterSortProps {
    servers: Server[];
    users: User[];
    getUserDisplayName: (user?: User | null) => string;
}

export function useServersFilterSort({ servers, users, getUserDisplayName }: UseServersFilterSortProps) {
    const [serverSearchQuery, setServerSearchQuery] = useState("");
    const [serverStatusFilter, setServerStatusFilter] = useState<"all" | "online" | "offline" | "hidden">("all");
    const [sortField, setSortField] = useState<"name" | "creator" | "ip" | "status" | "players">("name");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

    const filteredServers = useMemo(() => {
        let list = servers;
        const query = serverSearchQuery.trim().toLowerCase();

        if (query) {
            list = list.filter(s => 
                s.name.toLowerCase().includes(query) ||
                s.ip.toLowerCase().includes(query)
            );
        }

        if (serverStatusFilter === "online") {
            list = list.filter(s => s.last_status === "online");
        } else if (serverStatusFilter === "offline") {
            list = list.filter(s => s.last_status === "offline");
        } else if (serverStatusFilter === "hidden") {
            list = list.filter(s => s.hidden === true);
        }

        return list;
    }, [servers, serverSearchQuery, serverStatusFilter]);

    const sortedServers = useMemo(() => {
        const list = [...filteredServers];
        return list.sort((a, b) => {
            let valA: string | number = "";
            let valB: string | number = "";

            if (sortField === "name") {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (sortField === "creator") {
                const creatorA = users.find(u => u.id === a.user_id);
                const creatorB = users.find(u => u.id === b.user_id);
                valA = getUserDisplayName(creatorA).toLowerCase();
                valB = getUserDisplayName(creatorB).toLowerCase();
            } else if (sortField === "ip") {
                valA = `${a.ip}:${a.port}`.toLowerCase();
                valB = `${b.ip}:${b.port}`.toLowerCase();
            } else if (sortField === "status") {
                valA = a.last_status || "";
                valB = b.last_status || "";
            } else if (sortField === "players") {
                valA = a.last_status === "online" ? (a.last_connected ?? 0) : -1;
                valB = b.last_status === "online" ? (b.last_connected ?? 0) : -1;
            }

            if (valA < valB) return sortDirection === "asc" ? -1 : 1;
            if (valA > valB) return sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }, [filteredServers, sortField, sortDirection, users, getUserDisplayName]);

    const handleSort = (field: typeof sortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    return {
        serverSearchQuery,
        setServerSearchQuery,
        serverStatusFilter,
        setServerStatusFilter,
        sortField,
        sortDirection,
        handleSort,
        sortedServers
    };
}
