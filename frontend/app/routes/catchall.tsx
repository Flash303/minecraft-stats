import { isRouteErrorResponse, useRouteError } from "react-router";
import { useLanguage } from "@/core/contexts/LanguageContext";

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useLanguage();
  
  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-4xl font-bold">{error.status}</h1>
        <p className="text-xl text-muted-foreground">{error.statusText}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">{t("error.errorTitle")}</h1>
      <p className="text-xl text-muted-foreground">{t("error.somethingWentWrong")}</p>
    </div>
  );
}

export function loader() {
    throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
    const { t } = useLanguage();
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-xl text-muted-foreground">{t("error.pageNotFound")}</p>
        </div>
    )
}
