import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl) {
        return new Response("Invalid URL", { status: 400 });
    }

    let parsedTarget: URL;
    try {
        parsedTarget = new URL(targetUrl);
    } catch {
        return new Response("Invalid URL", { status: 400 });
    }

    // Validation stricte : protocole et hôte exacts (bloque les contournements
    // via userinfo comme https://dl.labymod.net@evil.com/ ou les ports arbitraires)
    if (
        parsedTarget.protocol !== "https:" ||
        parsedTarget.username ||
        parsedTarget.password ||
        parsedTarget.origin !== "https://dl.labymod.net"
    ) {
        return new Response("Invalid URL", { status: 400 });
    }

    try {
        const res = await fetch(targetUrl);
        if (!res.ok) {
            return new Response("Failed to fetch manifest", { status: res.status });
        }
        
        const data = await res.text();
        
        return new Response(data, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=3600"
            }
        });
    } catch {
        return new Response("Internal Server Error", { status: 500 });
    }
}
