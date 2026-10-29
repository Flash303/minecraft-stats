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
import { ThemeProvider } from "@/core/contexts/ThemeContext";
import { SearchProvider } from "@/core/contexts/SearchContext";
import { LanguageProvider } from "@/core/contexts/LanguageContext";
import { ToastProvider } from "@/core/contexts/ToastContext";
import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/ui/themes";
import { useTheme } from "@/core/hooks/useTheme";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminProvider } from "@/core/contexts/AdminContext";

import { TooltipProvider } from "@/ui/components/tooltip";
import { useEffect, useMemo, useState } from "react";
import { GlobalLoading } from "@/ui/components/global-loading";
import { BedrockLogoSprite } from "@/ui/components/BedrockLogo";
import { LabyLogoSprite } from "@/ui/components/LabyLogo";
import { APP_URL } from "@/core/lib/config";
import { parseLanguageCookie, resolveLanguageFromHeader } from "@/core/lib/accept-language";
import { type Language } from "@/core/lib/i18n";
import { translateMeta } from "@/core/lib/seo-meta";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// The client is created per App instance (useState initializer), deliberately
// NOT as a module singleton: during SSR the module is shared across requests,
// and a singleton cache would leak one request's `initialData` into the next
// request's HTML while the loader embeds fresh data -> hydration error #418
// (stale card order/counts vs fresh embedded data). On the client, useState
// keeps a single instance for the whole SPA session (same behavior as before).
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        refetchOnWindowFocus: true,
        staleTime: 60_000,
      },
    },
  });
}

export function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const matchTheme = cookieHeader.match(/theme=(light|dark)/);

  // Language: cookie first, otherwise server-side Accept-Language detection
  // -> SSR renders the right language directly, with no flash.
  const serverLanguage = parseLanguageCookie(cookieHeader)
    ?? resolveLanguageFromHeader(request.headers.get("Accept-Language"));

  return {
    serverTheme: matchTheme ? (matchTheme[1] as "light" | "dark") : null,
    serverLanguage,
  };
}

export function shouldRevalidate() {
  // The root loader only reads cookies (theme/language), so it does not need
  // to re-run on every client navigation.
  return false;
}

export function meta({ data }: { data?: { serverLanguage?: Language } }) {
  const lang = data?.serverLanguage ?? "fr"
  const L = (path: string) => translateMeta(lang, path)

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
  // Resolved server-side (cookie or Accept-Language) -> correct lang attribute
  // in the SSR HTML, with no client-side switch.
  const lang = rootData?.serverLanguage || "fr";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  // The theme class is NOT owned by React: the anti-flash script in <head>
  // sets it before first paint, then the ThemeContext effect keeps it in sync.
  // No hydration mismatch is possible.
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=(light|dark)/);var t=m?m[1]:(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark");}catch(e){}})();`,
          }}
        />
        <link rel="icon" type="image/webp" href="/logo.webp" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f4f5" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#09090b" />
        <link rel="describedby" href="/llms.txt" type="text/plain" />
        {/* Plus Jakarta Sans is self-hosted (see index.css): no render-blocking
            Google Fonts stylesheet and no third-party requests. */}
        <link rel="preload" href="/fonts/PlusJakartaSans-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Umami Analytics */}
        <script defer src="https://cloud.umami.is/script.js" data-website-id="367e7c31-118f-4c1d-91df-4d264facff62"></script>
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${APP_URL}/#website`,
                  "name": "Minecraft-Stats",
                  "url": APP_URL,
                  "description": translateMeta(lang, "seo.homeDescription"),
                  "publisher": { "@id": `${APP_URL}/#organization` },
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": `${APP_URL}/?search={search_term_string}`,
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": `${APP_URL}/#organization`,
                  "name": "Minecraft-Stats",
                  "url": APP_URL,
                  "logo": `${APP_URL}/logo.webp`
                }
              ]
            })
          }}
        />
      </head>
      <body>
        <GlobalLoading />
        <BedrockLogoSprite />
        <LabyLogoSprite />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function ThemedClerkProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  // The app loads Clerk's new shared UI (@clerk/ui, see clerkUIVariant in
  // @clerk/react): it only honors the `theme` key — the legacy `baseTheme`
  // key is silently ignored (verified in @clerk/ui's parseAppearance).
  const appearance = useMemo(
    () => ({ theme: theme === "dark" ? dark : undefined }),
    [theme]
  );
  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={appearance}
    >
      {children}
    </ClerkProvider>
  );
}

export default function App() {
  const { serverTheme, serverLanguage } = useLoaderData<typeof loader>();
  // Per-instance client (fresh empty cache on every SSR render, stable
  // singleton for the whole SPA session on the client).
  const [queryClient] = useState(createQueryClient);

  if (!PUBLISHABLE_KEY) {
    console.error("Missing Publishable Key");
    return (
      <ThemeProvider serverTheme={serverTheme}>
        <LanguageProvider serverLanguage={serverLanguage}>
          <Outlet />
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider serverTheme={serverTheme}>
      <LanguageProvider serverLanguage={serverLanguage}>
        <ToastProvider>
          <ThemedClerkProvider>
            <QueryClientProvider client={queryClient}>
              <AdminProvider>
                <SearchProvider>
                  <TooltipProvider>
                    <Outlet />
                  </TooltipProvider>
                </SearchProvider>
              </AdminProvider>
            </QueryClientProvider>
          </ThemedClerkProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
