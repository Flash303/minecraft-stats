export interface LabyModServer {
  server_name: string;
  nice_name: string;
  direct_ip: string;
  wildcards?: string[];
  server_wildcards?: string[];
  attachments?: {
    file_name: string;
    url: string;
  }[];
  social?: {
    web?: string;
    web_shop?: string;
    twitter?: string;
    tiktok?: string;
    instagram?: string;
    discord?: string;
    youtube?: string;
  };
  gamemodes?: Record<string, {
    name: string;
    color?: string;
    command?: string;
  }>;
  user_stats?: string;
}

let cachedLabyServers: LabyModServer[] | null = null;
let fetchPromise: Promise<LabyModServer[]> | null = null;

export async function fetchLabyModServers(): Promise<LabyModServer[]> {
  if (cachedLabyServers) {
    return cachedLabyServers;
  }
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = Promise.allSettled([
    fetch('https://dl.labymod.net/server_groups.json').then(res => res.ok ? res.json() : Promise.reject(res.status)),
    fetch('/api/laby/servers').then(res => res.ok ? res.json() : Promise.reject(res.status))
  ])
    .then(([groupsResult, publicResult]) => {
      let groupsServers: LabyModServer[] = [];
      if (groupsResult.status === 'fulfilled' && groupsResult.value) {
        groupsServers = Object.values(groupsResult.value.server_groups || {}) as LabyModServer[];
      } else {
        console.warn('Failed to fetch from LabyMod server_groups:', groupsResult.status === 'rejected' ? groupsResult.reason : undefined);
      }

      const mergedMap = new Map<string, LabyModServer>();
      
      for (const server of groupsServers) {
        if (server.direct_ip) {
          mergedMap.set(server.direct_ip.toLowerCase(), server);
        }
      }

      if (publicResult.status === 'fulfilled' && publicResult.value && publicResult.value.servers) {
        const publicServers = publicResult.value.servers as Record<string, { partner: boolean }>;
        for (const [ip, data] of Object.entries(publicServers)) {
          const lowerIp = ip.toLowerCase();
          const existing = mergedMap.get(lowerIp);
          if (existing) {
            existing.partnered = data.partner;
          } else {
            // Create a new entry if not found in server_groups
            mergedMap.set(lowerIp, {
              server_name: ip,
              nice_name: ip,
              direct_ip: lowerIp,
              partnered: data.partner
            });
          }
        }
      } else {
        console.warn('Failed to fetch from LabyMod publicServers API:', publicResult.status === 'rejected' ? publicResult.reason : undefined);
      }

      const merged = Array.from(mergedMap.values());
      cachedLabyServers = merged;
      return merged;
    })
    .catch((err) => {
      console.error('Failed to process LabyMod servers:', err);
      return [];
    })
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function matchesLabyMod(ip: string, labyServer: LabyModServer): boolean {
  if (!ip || !labyServer) return false;
  
  if (labyServer.direct_ip && ip.toLowerCase() === labyServer.direct_ip.toLowerCase()) {
    return true;
  }
  
  const allWildcards = labyServer.wildcards || labyServer.server_wildcards;
  
  if (allWildcards && Array.isArray(allWildcards)) {
    for (const wildcard of allWildcards) {
      if (!wildcard) continue;
      
      let regexStr = wildcard.replace(/\./g, '\\.');
      regexStr = regexStr.replace(/(%|\*)\\\./g, '(.*\\.)?'); 
      regexStr = regexStr.replace(/%|\*/g, '.*');
      
      try {
        const regex = new RegExp(`^${regexStr}$`, 'i');
        if (regex.test(ip)) {
          return true;
        }
      } catch {
        // Ignore silently
      }
    }
  }
  
  return false;
}

export async function getLabyModServerInfo(ip: string): Promise<LabyModServer | undefined> {
  if (!ip) return undefined;
  
  const servers = await fetchLabyModServers();
  return servers.find((s) => matchesLabyMod(ip, s));
}

export async function getLabyModBackground(ip: string): Promise<string | undefined> {
  const matchedServer = await getLabyModServerInfo(ip);
  
  if (matchedServer && matchedServer.attachments) {
    return matchedServer.attachments.find(
      (a) => a.file_name === 'background.webp' || a.file_name === 'background.png'
    )?.url;
  }
  
  return undefined;
}
