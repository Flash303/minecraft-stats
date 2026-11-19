import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Dedicated bundle for the Service Worker (`app/service-worker/sw.ts`).
// It inlines the shared i18n dictionaries so push notifications are rendered
// in the device language with no duplication and no runtime fetch.
//
// Output is `public/sw.js`, which `react-router build` then copies to
// `build/client/sw.js` (served at `/sw.js` with `no-cache`, see `server.ts`).
// `emptyOutDir: false` is load-bearing: never wipe `public/`.
export default defineConfig({
  // Don't copy `public/` into the SW output: outDir IS `public/`.
  publicDir: false,
  build: {
    lib: {
      entry: resolve(__dirname, "app/service-worker/sw.ts"),
      name: "mcStatsSW",
      formats: ["iife"],
      fileName: () => "sw.js",
    },
    outDir: "public",
    emptyOutDir: false,
    minify: true,
  },
});
