import type { Route } from "./+types/sitemap";
import { fetchServers } from "@/core/lib/api";

export async function loader({ request }: Route.LoaderArgs) {
  const forwardedFor = request.headers.get("x-forwarded-for") || request.headers.get("cf-connecting-ip") || request.headers.get("x-real-ip");
  const servers = await fetchServers(undefined, false, forwardedFor);
  
  const urls = servers.map(server => `
  <url>
    <loc>https://mc-stats.fr/server/${server.id}</loc>
    <changefreq>hourly</changefreq>
    <priority>0.8</priority>
  </url>`).join('');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://mc-stats.fr/</loc>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://mc-stats.fr/compare</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${urls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
