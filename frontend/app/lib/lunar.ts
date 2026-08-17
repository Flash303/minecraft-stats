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

  fetchPromise = fetch('https://servermappings.lunarclientcdn.com/servers.json')
    .then((res) => res.json())
    .then((data) => {
      const servers = data as LunarServer[];
      cachedLunarServers = servers;
      return servers;
    })
    .catch((err) => {
      console.error('Failed to fetch Lunar Client servers:', err);
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
