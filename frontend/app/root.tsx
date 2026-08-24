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
import { ClerkProvider } from "@clerk/react";
import { AdminProvider } from "./core/contexts/AdminContext";
import { ClientInfoProvider } from "./core/contexts/ClientInfoContext";
import { TooltipProvider } from "@/ui/components/tooltip";
import { useEffect } from "react";
import { GlobalLoading } from "./ui/components/global-loading";
import { APP_URL } from "./core/lib/config";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function loader({ request }: LoaderFunctionArgs) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const matchTheme = cookieHeader.match(/theme=(light|dark)/);
  const matchLang = cookieHeader.match(/language=(fr|en)/);

  return {
    serverTheme: matchTheme ? (matchTheme[1] as "light" | "dark") : null,
    serverLanguage: matchLang ? (matchLang[1] as "fr" | "en") : null,
  };
}

export function shouldRevalidate() {
  // Le loader de root ne lit que les cookies (thème/langue).
  // On n'a pas besoin de le re-fetcher à chaque navigation client.
  return false;
}

export function meta() {
  return [
    { title: "Minecraft-Stats | Minecraft Server Analytics" },
    { name: "description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Minecraft-Stats" },
    { property: "og:title", content: "Minecraft-Stats | Minecraft Server Analytics" },
    { property: "og:description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "og:image", content: `${APP_URL}/opengraph.webp` },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: APP_URL },
    { property: "og:logo", content: `${APP_URL}/logo.webp` },
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:title", content: "Minecraft-Stats | Minecraft Server Analytics" },
    { property: "twitter:description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "twitter:image", content: `${APP_URL}/opengraph.webp` },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  const rootData = useRouteLoaderData<typeof loader>("root");
  const theme = rootData?.serverTheme || "dark"; // Default to dark if no cookie
  // "fr" par défaut pour correspondre à la langue par défaut du LanguageProvider
  const lang = rootData?.serverLanguage || "fr";

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  return (
    <html lang={lang} className={theme}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/webp" href="/logo.webp" />
        {/* Google Fonts : connexion anticipée pour réduire le render-blocking du @import CSS */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
      <AdminProvider>
        <ThemeProvider serverTheme={serverTheme}>
          <LanguageProvider serverLanguage={serverLanguage}>
            <ClientInfoProvider>
              <SearchProvider>
                <TooltipProvider>
                  <Outlet />
                </TooltipProvider>
              </SearchProvider>
            </ClientInfoProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AdminProvider>
    </ClerkProvider>
  );
}
