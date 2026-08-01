import type { Route } from "./+types/favicon";
import { fetchServer } from "@/lib/api";

export async function loader({ params }: Route.LoaderArgs) {
    try {
        const server = await fetchServer(Number(params.id));
        if (server && server.last_favicon) {
            const base64Data = server.last_favicon.replace(/^data:image\/\w+;base64,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            return new Response(buffer, {
                headers: {
                    "Content-Type": "image/png",
                    "Cache-Control": "public, max-age=86400",
                },
            });
        }
    } catch (e) {
        console.error("Failed to load favicon for OG image", e);
    }
    
    // Fallback to default opengraph image or empty response
    return new Response(null, { status: 404 });
}
