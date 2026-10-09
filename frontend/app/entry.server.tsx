import type { AppLoadContext, EntryContext } from "react-router";
import { ServerRouter } from "react-router";
import { renderToReadableStream } from "react-dom/server";
import { isbot } from "isbot";
import { applySecurityHeaders } from "../security";
// Enregistre les 12 locales dans le registre i18n avant le render SSRs
// (les meta() et le HTML dépendent de la langue résolue par cookie).
import "./core/lib/i18n.server";

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  loadContext: AppLoadContext
) {
  const prohibitOutOfOrder =
    isbot(request.headers.get("user-agent")) || reactRouterContext.isSpaMode;

  const body = await renderToReadableStream(
    <ServerRouter
      context={reactRouterContext}
      url={request.url}
      abortDelay={5000}
    />,
    {
      signal: request.signal,
      onError(error: unknown) {
        if (!request.signal.aborted) {
          console.error(error);
          responseStatusCode = 500;
        }
      },
    }
  );

  if (prohibitOutOfOrder) {
    await body.allReady;
  }

  responseHeaders.set("Content-Type", "text/html; charset=utf-8");
  const existingLink = responseHeaders.get("Link");
  const llmsLink = '</llms.txt>; rel="describedby"';
  if (!existingLink) {
    responseHeaders.set("Link", llmsLink);
  } else if (!existingLink.includes("llms.txt")) {
    responseHeaders.set("Link", `${existingLink}, ${llmsLink}`);
  }
  applySecurityHeaders(responseHeaders);

  return new Response(body, {
    headers: responseHeaders,
    status: responseStatusCode,
  });
}
