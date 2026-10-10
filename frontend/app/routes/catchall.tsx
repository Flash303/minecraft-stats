import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { BarChart3, Ghost, House } from "lucide-react";
import { useLanguage } from "@/core/contexts/LanguageContext";
import { Button } from "@/ui/components/button";

export function meta() {
  return [{ name: "robots", content: "noindex" }];
}

function NotFoundActions() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col sm:flex-row items-center gap-3">
      <Button asChild>
        <Link to="/">
          <House />
          {t("admin.backHome")}
        </Link>
      </Button>
      <Button variant="outline" asChild>
        <Link to="/compare">
          <BarChart3 />
          {t("comparison.title")}
        </Link>
      </Button>
    </div>
  );
}

function NotFoundBlock({ code, title }: { code: string; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 py-12 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50">
        <Ghost className="h-10 w-10 text-muted-foreground" />
      </div>
      <h1 className="text-6xl font-extrabold tracking-tight text-foreground">{code}</h1>
      <p className="text-xl text-muted-foreground">{title}</p>
      <NotFoundActions />
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const { t } = useLanguage();

  if (isRouteErrorResponse(error)) {
    const title = error.status === 404 ? t("error.pageNotFound") : error.statusText;
    return <NotFoundBlock code={String(error.status)} title={title} />;
  }

  return <NotFoundBlock code="500" title={t("error.somethingWentWrong")} />;
}

export function loader() {
    throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
    const { t } = useLanguage();
    return <NotFoundBlock code="404" title={t("error.pageNotFound")} />
}
