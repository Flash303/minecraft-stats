import type { Route } from "./+types/favicon";
import { API_BASE } from "@/lib/api";

export async function loader({ params }: Route.LoaderArgs) {
    try {
        const res = await fetch(`${API_BASE}/servers/${params.id}/icon`);
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            const headers = new Headers();
            res.headers.forEach((value, key) => {
                headers.set(key, value);
            });
            return new Response(buffer, { headers });
        }
    } catch (e) {
        console.error("Failed to load favicon", e);
    }
    
    return new Response(null, { status: 404 });
}
