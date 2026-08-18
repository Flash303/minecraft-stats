import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
    try {
        const uuid = crypto.randomUUID();
        const res = await fetch(`https://api.lunarclientprod.com/launcher/servers?installation_id=${uuid}&os=win32&os_release=10.0&arch=x64&launcher_version=3.0.0`, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            }
        });
        
        if (!res.ok) {
            return new Response("Failed to fetch Lunar servers", { status: res.status });
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
