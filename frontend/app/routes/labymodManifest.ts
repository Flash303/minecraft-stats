import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get("url");

    if (!targetUrl || !targetUrl.startsWith("https://dl.labymod.net/")) {
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
