import { APP_URL } from "@/core/lib/config";

export async function loader() {
    const robotsContent = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /dashboard
Disallow: /account

# AI search crawlers (retrieval for citations and answers, not training):
# explicitly allowed on public pages, same private-path exclusions as everyone.
User-agent: OAI-SearchBot
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account

User-agent: ChatGPT-User
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account

User-agent: PerplexityBot
Allow: /
Disallow: /admin
Disallow: /dashboard
Disallow: /account

User-agent: Claude-SearchBot
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
