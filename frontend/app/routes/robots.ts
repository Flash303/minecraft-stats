import { APP_URL } from "@/core/lib/config";

export async function loader() {
    const robotsContent = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /dashboard
Disallow: /account

Sitemap: ${APP_URL}/sitemap.xml
`;

    return new Response(robotsContent, {
        headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400"
        }
    });
}
