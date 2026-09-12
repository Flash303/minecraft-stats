import { redirect } from "react-router";
import type { Route } from "./+types/favicon";

export async function loader({ params }: Route.LoaderArgs) {
    const publicApiUrl = import.meta.env.VITE_API_URL || "https://mc-stats.fr/api";
    return redirect(`${publicApiUrl}/servers/${params.id}/icon`, 301);
}
