import { serve } from "bun";
import { createRequestHandler } from "react-router";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";
import { applySecurityHeaders } from "./security";
import { parseLanguageCookie, resolveLanguageFromHeader } from "./app/core/lib/accept-language";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BUILD_DIR = path.join(__dirname, "build");
const serverBuildPath = path.join(BUILD_DIR, "server", "index.js");

let build;
try {
  build = await import(serverBuildPath);
} catch (e) {
  console.error("Could not load React Router server build. Make sure to run `pnpm run build` first.", e);
  process.exit(1);
}

const requestHandler = createRequestHandler(build, process.env.NODE_ENV);

// Simple in-memory ISR cache (Action 1.2)
const isrCache = new Map<string, { html: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const ISR_CACHE_MAX_ENTRIES = 500;

const CLIENT_DIR = path.join(BUILD_DIR, "client");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".wasm": "application/wasm",
};

function getContentType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function getCacheControl(urlPath: string): string {
  if (urlPath === "/sw.js") {
    // Le service worker doit être revalidé pour permettre les mises à jour
    return "no-cache";
  }
  // Assets fingerprintés par le build -> cache immuable
  if (urlPath.startsWith("/assets/") || /\.[0-9a-f]{8,}\./i.test(path.basename(urlPath))) {
    return "public, max-age=31536000, immutable";
  }
  return "public, max-age=3600";
}

function serveStaticFile(staticFilePath: string, urlPath: string): Response | null {
  const stat = fs.statSync(staticFilePath, { throwIfNoEntry: false });
  if (!stat || !stat.isFile()) return null;

  const file = Bun.file(staticFilePath);
  return new Response(file, {
    headers: applySecurityHeaders(
      new Headers({
        "Content-Type": getContentType(staticFilePath),
        "Cache-Control": getCacheControl(urlPath),
      })
    ),
  });
}

serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Serve static files from build/client
    if (url.pathname !== "/") {
      const staticFilePath = path.resolve(CLIENT_DIR, "." + url.pathname);
      // Défense en profondeur : le chemin résolu doit rester sous build/client
      if (staticFilePath.startsWith(CLIENT_DIR + path.sep)) {
        const staticResponse = serveStaticFile(staticFilePath, url.pathname);
        if (staticResponse) return staticResponse;
      }
    }

    // 2. ISR Cache logic
    // Only cache GET HTML requests (ignore data requests and assets)
    if (req.method === "GET" && !url.searchParams.has("_data") && !url.pathname.startsWith("/assets")) {
      // Bypass cache for private logged-in routes
      if (
        url.pathname.startsWith("/account") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/dashboard")
      ) {
        return requestHandler(req);
      }

      const cookieHeader = req.headers.get("Cookie") || "";

      const theme = cookieHeader.match(/theme=(light|dark)/)?.[1] || "default";
      // Langue résolue comme le loader SSR (cookie -> Accept-Language) :
      // chaque langue obtient sa propre entrée de cache, sans croisement.
      const lang = parseLanguageCookie(cookieHeader) ?? resolveLanguageFromHeader(req.headers.get("Accept-Language"));
      const cacheKey = `${url.pathname}${url.search}|theme:${theme}|lang:${lang}`;
      const cached = isrCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        console.log(`[Cache HIT] ${url.pathname}${url.search} (theme: ${theme}, lang: ${lang})`);
        return new Response(cached.html, {
          headers: applySecurityHeaders(
            new Headers({ "Content-Type": "text/html; charset=utf-8" })
          ),
        });
      }

      const startTime = performance.now();
      // Intercept the response to cache it
      const response = await requestHandler(req);
      const renderTime = Math.round(performance.now() - startTime);

      if (response.status === 200 && response.headers.get("Content-Type")?.includes("text/html")) {
        const clonedResponse = response.clone();
        const html = await clonedResponse.text();

        // Bornage mémoire : éviction FIFO si le cache dépasse la limite
        if (isrCache.size >= ISR_CACHE_MAX_ENTRIES && !isrCache.has(cacheKey)) {
          const oldestKey = isrCache.keys().next().value;
          if (oldestKey !== undefined) isrCache.delete(oldestKey);
        }
        isrCache.set(cacheKey, {
          html,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        console.log(`[SSR Render] ${url.pathname}${url.search} (theme: ${theme}, lang: ${lang}) - ${renderTime}ms`);
        return response;
      }

      return response;
    }

    // 3. Fallback
    return requestHandler(req);
  },
});

console.log(`Bun Server listening on http://localhost:${process.env.PORT || 3000}`);
