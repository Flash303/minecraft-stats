export interface LunarServer {
  id: string;
  name: string;
  website?: string;
  store?: string;
  description?: string;
  addresses: string[];
  primaryAddress?: string;
  primaryColor?: string;
  secondaryColor?: string;
  minecraftVersions?: string[];
  primaryMinecraftVersion?: string;
  crossplay?: boolean;
  regions?: string[];
  languages?: string[];
  gameTypes?: string[];
  socials?: Record<string, string>;
  images?: {
    logo?: string;
    background?: string;
    [key: string]: string | undefined;
  };
  localizedDescriptions?: Record<string, string>;
  partnered?: boolean;
  presentationVideo?: string;
}

let cachedLunarServers: LunarServer[] | null = null;
let fetchPromise: Promise<LunarServer[]> | null = null;

export async function fetchLunarServers(): Promise<LunarServer[]> {
  if (cachedLunarServers) {
    return cachedLunarServers;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = Promise.allSettled([
    fetch('/api/lunar/servers').then(res => res.ok ? res.json() : Promise.reject(res.status)),
    fetch('https://servermappings.lunarclientcdn.com/servers.json').then(res => res.ok ? res.json() : Promise.reject(res.status))
  ])
    .then(([proxyResult, cdnResult]) => {
      let proxyServers: LunarServer[] = [];
      if (proxyResult.status === 'fulfilled' && proxyResult.value) {
        proxyServers = proxyResult.value.servers as LunarServer[];
      } else {
        console.warn('Failed to fetch from Lunar prod API proxy:', proxyResult.status === 'rejected' ? proxyResult.reason : undefined);
      }

      let cdnServers: LunarServer[] = [];
      if (cdnResult.status === 'fulfilled' && cdnResult.value) {
        cdnServers = cdnResult.value as LunarServer[];
      } else {
        console.warn('Failed to fetch from Lunar CDN:', cdnResult.status === 'rejected' ? cdnResult.reason : undefined);
      }

      const mergedMap = new Map<string, LunarServer>();
      
      for (const server of cdnServers) {
        if (server.id) {
          mergedMap.set(server.id, server);
        }
      }

      for (const server of proxyServers) {
        if (server.id) {
          mergedMap.set(server.id, { ...mergedMap.get(server.id), ...server });
        }
      }

      const merged = Array.from(mergedMap.values());
      cachedLunarServers = merged;
      return merged;
    })
    .catch((err) => {
      console.error('Failed to process Lunar servers:', err);
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function matchesLunar(ip: string, lunarServer: LunarServer): boolean {
  if (!ip || !lunarServer) return false;
  
  const targetIp = ip.toLowerCase();
  
  if (lunarServer.primaryAddress && lunarServer.primaryAddress.toLowerCase() === targetIp) {
      return true;
  }

  for (const addr of lunarServer.addresses) {
    if (!addr) continue;
    
    // Exact match
    if (addr.toLowerCase() === targetIp) {
        return true;
    }

    // Subdomain match (e.g. play.hypixel.net matches hypixel.net)
    if (targetIp.endsWith('.' + addr.toLowerCase())) {
        return true;
    }
  }
  
  return false;
}

export async function getLunarServerInfo(ip: string): Promise<LunarServer | undefined> {
  if (!ip) return undefined;
  
  const servers = await fetchLunarServers();
  return servers.find((s) => matchesLunar(ip, s));
}

export async function getLunarBackground(ip: string): Promise<string | undefined> {
  const matchedServer = await getLunarServerInfo(ip);
  return matchedServer?.images?.background;
}
