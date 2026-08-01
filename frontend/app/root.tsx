import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { SearchProvider } from "./contexts/SearchContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ClerkProvider } from "@clerk/react";
import { AdminProvider } from "./contexts/AdminContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function meta() {
  return [
    { title: "Minecraft-Stats | Minecraft Server Analytics" },
    { name: "description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Minecraft-Stats" },
    { property: "og:title", content: "Minecraft-Stats | Minecraft Server Analytics" },
    { property: "og:description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "og:image", content: "https://mc-stats.fr/opengraph.webp" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url", content: "https://mc-stats.fr" },
    { property: "og:logo", content: "https://mc-stats.fr/logo.webp" },
    { property: "twitter:card", content: "summary_large_image" },
    { property: "twitter:title", content: "Minecraft-Stats | Minecraft Server Analytics" },
    { property: "twitter:description", content: "Track Minecraft server analytics, player counts, and uptime. Real-time alerts and stats for Java & Bedrock admins." },
    { property: "twitter:image", content: "https://mc-stats.fr/opengraph.webp" },
  ];
}

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then(reg => console.log("Service Worker registered successfully:", reg.scope))
        .catch(err => console.error("Service Worker registration failed:", err));
    }
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem("theme");
                if (!theme) {
                  theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                }
                if (theme === "dark") {
                  document.documentElement.classList.add("dark");
                }
              } catch (e) {}
            `,
          }}
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/webp" href="/logo.webp" />
        <Meta />
        <Links />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Minecraft-Stats",
              "url": "https://mc-stats.fr",
              "description": "Advanced Minecraft server analytics and player tracking.",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://mc-stats.fr/?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  if (!PUBLISHABLE_KEY) {
    console.error("Missing Publishable Key");
    return <Outlet />;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <AdminProvider>
        <ThemeProvider>
          <LanguageProvider>
            <SearchProvider>
              <TooltipProvider>
                <Outlet />
              </TooltipProvider>
            </SearchProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AdminProvider>
    </ClerkProvider>
  );
}
