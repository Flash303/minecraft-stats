import { redirect } from "react-router";
import { PUBLIC_API_URL } from "@/core/lib/config";
import type { Route } from "./+types/favicon";

export async function loader({ params }: Route.LoaderArgs) {
    return redirect(`${PUBLIC_API_URL}/servers/${params.id}/icon`, 301);
}
