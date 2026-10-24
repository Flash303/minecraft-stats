import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { loadLanguage, type Language } from "@/core/lib/i18n";

// The language was resolved server-side (cookie/Accept-Language): read it from
// the <html lang> attribute set by SSR and load its dictionary BEFORE
// hydration so the first client render matches the server HTML exactly
// (no hydration mismatch, no flash of i18n keys).
async function preloadActiveLanguage(): Promise<void> {
  try {
    const lang = document.documentElement.lang as Language
    if (lang) {
      await loadLanguage(lang)
    }
  } catch (e) {
    console.error("Failed to preload language dictionary:", e)
  }
}

preloadActiveLanguage().then(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>
    );
  });
});