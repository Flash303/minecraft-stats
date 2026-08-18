import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const res = await fetch("https://laby.net/api/v3/publicServers", {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            }
        });
        
        if (!res.ok) {
            return new Response("Failed to fetch Laby public servers", { status: res.status });
        }
        
        const data = await res.text();
        
        return new Response(data, {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=3600",
                "Access-Control-Allow-Origin": "*"
            }
        });
    } catch {
        return new Response("Internal Server Error", { status: 500 });
    }
}
