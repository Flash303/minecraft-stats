export async function loader() {
    const robotsContent = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /account

Sitemap: https://mc-stats.fr/sitemap.xml
`;

    return new Response(robotsContent, {
        headers: {
            "Content-Type": "text/plain",
            "Cache-Control": "public, max-age=86400"
        }
    });
}
