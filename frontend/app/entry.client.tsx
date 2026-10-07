import { HydratedRouter } from "react-router/dom";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { loadLanguage, type Language } from "@/core/lib/i18n";

// La langue a été rendue côté serveur (cookie/Accept-Language) : on la lit sur
// l'attribut <html lang> posé par le SSR et on charge son dictionnaire AVANT
// l'hydratation, pour que le premier rendu client corresponde exactement au
// HTML serveur (aucune divergence d'hydratation, aucun flash de clés i18n).
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