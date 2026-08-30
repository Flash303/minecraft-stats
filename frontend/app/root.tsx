import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import "./index.css";
import { ThemeProvider } from "./core/contexts/ThemeContext";
import { SearchProvider } from "./core/contexts/SearchContext";
import { LanguageProvider } from "./core/contexts/LanguageContext";
import { ToastProvider } from "./core/contexts/ToastContext";
import { ClerkProvider } from "@clerk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminProvider } from "./core/contexts/AdminContext";
import { ClientInfoProvider } from "./core/contexts/ClientInfoContext";
import { TooltipProvider } from "@/ui/components/tooltip";
import { useEffect } from "react";
import { GlobalLoading } from "./ui/components/global-loading";
import { APP_URL } from "./core/lib/config";
import { parseLanguageCookie, resolveLanguageFromHeader } from "./core/lib/accept-language";
import { translate } from "./core/lib/i18n";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Singleton : les queries ne s'exécutent que côté client (post-hydratation),
// pas besoin de client par requête SSR.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
      staleTime: 60_000,
    },
  },
});

export function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const matchTheme = cookieHeader.match(/theme=(light|dark)/);

  // Langue : cookie d'abord, sinon détection serveur via Accept-Language
  // -> le SSR rend directement la bonne langue, aucun flash possible.
  const serverLanguage = parseLanguageCookie(cookieHeader)
    ?? resolveLanguageFromHeader(request.headers.get("Accept-Language"));

  return {
    serverTheme: matchTheme ? (matchTheme[1] as "light" | "dark") : null,
    serverLanguage,
  };
}

export function shouldRevalidate() {
  // Le loader de root ne lit que les cookies (thème/langue).
  // On n'a pas besoin de le re-fetcher à chaque navigation client.
  return false;
}

export function meta({ data }: { data?: { serverLanguage?: "fr" | "en" } }) {
  const lang = data?.serverLanguage ?? "fr"
  const L = (path: string) => translate(lang, path)

  return [
    { title: L("seo.homeTitle") },
    { name: "description", content: L("seo.homeDescription") },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Minecraft-Stats" },
    { property: "og:title", content: L("seo.homeTitle") },
    { property: "og:description", content: L("seo.homeDescription") },
    { property: "og:image", content: `${APP_URL}/opengraph.webp` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: APP_URL },
    { property: "og:logo", content: `${APP_URL}/logo.webp` },
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:title", content: L("seo.homeTitle") },
    { property: "twitter:description", content: L("seo.homeDescription") },
    { property: "twitter:image", content: `${APP_URL}/opengraph.webp` },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  const rootData = useRouteLoaderData<typeof loader>("root");
  // Résolue côté serveur (cookie ou Accept-Language) -> attribut lang correct
  // dès le HTML SSR, sans bascule client.
  const lang = rootData?.serverLanguage || "fr";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  // La classe de thème n'appartient PAS à React : le script anti-flash dans
  // <head> la pose avant le premier paint, l'effet de ThemeContext la met à
  // jour ensuite. Aucune divergence d'hydratation possible.
  return (
    <html lang={lang}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`,
          }}
        />
        <link rel="icon" type="image/webp" href="/logo.webp" />
        {/* Google Fonts : preconnect + stylesheet en <link> (l'@import CSS était render-blocking) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap"
        />
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Minecraft-Stats",
              "url": APP_URL,
              "description": "Advanced Minecraft server analytics and player tracking.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": `${APP_URL}/?search={search_term_string}`,
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body>
        <GlobalLoading />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { serverTheme, serverLanguage } = useLoaderData<typeof loader>();

  if (!PUBLISHABLE_KEY) {
    console.error("Missing Publishable Key");
    return <Outlet />;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <QueryClientProvider client={queryClient}>
        <AdminProvider>
        <ThemeProvider serverTheme={serverTheme}>
          <LanguageProvider serverLanguage={serverLanguage}>
            <ToastProvider>
              <ClientInfoProvider>
                <SearchProvider>
                  <TooltipProvider>
                    <Outlet />
                  </TooltipProvider>
                </SearchProvider>
              </ClientInfoProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
        </AdminProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
