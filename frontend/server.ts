import { serve } from "bun";
import { createRequestHandler } from "react-router";
import * as path from "node:path";
import * as fs from "node:fs";
import { fileURLToPath } from "node:url";

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

serve({
  port: process.env.PORT || 3000,
  async fetch(req) {
    const url = new URL(req.url);

    // 1. Serve static files from build/client
    if (url.pathname !== "/") {
      const staticFilePath = path.join(BUILD_DIR, "client", url.pathname);
      const stat = fs.statSync(staticFilePath, { throwIfNoEntry: false });
      if (stat && stat.isFile()) {
        const file = Bun.file(staticFilePath);
        return new Response(file);
      }
    }

    // 2. ISR Cache logic
    // Only cache GET HTML requests (ignore data requests and assets)
    if (req.method === "GET" && !url.searchParams.has("_data") && !url.pathname.startsWith("/assets")) {
      const cookieHeader = req.headers.get("Cookie") || "";
      const theme = cookieHeader.match(/theme=(light|dark)/)?.[1] || "default";
      const lang = cookieHeader.match(/language=(fr|en)/)?.[1] || "default";
      const cacheKey = `${url.pathname}${url.search}|theme:${theme}|lang:${lang}`;
      const cached = isrCache.get(cacheKey);
      
      if (cached && cached.expiresAt > Date.now()) {
        return new Response(cached.html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // Intercept the response to cache it
      const response = await requestHandler(req);

      if (response.status === 200 && response.headers.get("Content-Type")?.includes("text/html")) {
        const clonedResponse = response.clone();
        const html = await clonedResponse.text();
        isrCache.set(cacheKey, {
          html,
          expiresAt: Date.now() + CACHE_TTL_MS,
        });
        return response;
      }

      return response;
    }

    // 3. Fallback
    return requestHandler(req);
  },
});

console.log(`Bun Server listening on http://localhost:${process.env.PORT || 3000}`);
