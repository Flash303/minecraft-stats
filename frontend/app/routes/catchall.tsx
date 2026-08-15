import { isRouteErrorResponse, useRouteError } from "react-router";

export function ErrorBoundary() {
  const error = useRouteError();
  
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
      <h1 className="text-4xl font-bold">Error</h1>
      <p className="text-xl text-muted-foreground">Something went wrong.</p>
    </div>
  );
}

export function loader() {
    throw new Response("Not Found", { status: 404 });
}

export default function CatchAll() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <h1 className="text-4xl font-bold">404</h1>
            <p className="text-xl text-muted-foreground">Page Not Found</p>
        </div>
    )
}
