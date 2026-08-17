import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchLabyModServers, type LabyModServer, matchesLabyMod } from '@/core/lib/labymod';
import { fetchLunarServers, type LunarServer, matchesLunar } from '@/core/lib/lunar';

interface ClientInfoContextType {
    labyServers: LabyModServer[];
    lunarServers: LunarServer[];
    isLoading: boolean;
    getLabyInfo: (ip: string) => LabyModServer | undefined;
    getLunarInfo: (ip: string) => LunarServer | undefined;
}

const ClientInfoContext = createContext<ClientInfoContextType>({
    labyServers: [],
    lunarServers: [],
    isLoading: true,
    getLabyInfo: () => undefined,
    getLunarInfo: () => undefined,
});

export const useClientInfo = () => useContext(ClientInfoContext);

export const ClientInfoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [labyServers, setLabyServers] = useState<LabyModServer[]>([]);
    const [lunarServers, setLunarServers] = useState<LunarServer[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetchLabyModServers(),
            fetchLunarServers()
        ]).then(([laby, lunar]) => {
            setLabyServers(laby);
            setLunarServers(lunar);
            setIsLoading(false);
        }).catch(err => {
            console.error("Failed to load client info:", err);
            setIsLoading(false);
        });
    }, []);

    const getLabyInfo = (ip: string) => {
        if (!ip || isLoading) return undefined;
        return labyServers.find(s => matchesLabyMod(ip, s));
    };

    const getLunarInfo = (ip: string) => {
        if (!ip || isLoading) return undefined;
        return lunarServers.find(s => matchesLunar(ip, s));
    };

    return (
        <ClientInfoContext.Provider value={{ labyServers, lunarServers, isLoading, getLabyInfo, getLunarInfo }}>
            {children}
        </ClientInfoContext.Provider>
    );
};
