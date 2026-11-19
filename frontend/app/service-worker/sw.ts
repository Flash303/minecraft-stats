/// <reference lib="webworker" />

/**
 * Service Worker source — bundled by `vite.sw.config.ts` into `public/sw.js`.
 *
 * DO NOT edit `public/sw.js` by hand: it is generated from this file, so the
 * push-notification copy always comes from the shared i18n dictionaries
 * (`app/locales/*.json`, keys `notifications.push.*`).
 *
 * Only that 7-key subset is bundled (via `push-strings.generated.ts`,
 * produced by `scripts/build-sw-push-strings.mjs`): the full dictionaries
 * would bloat the SW to ~500 KB. Rendering still goes through the shared
 * `translate()` engine, including its English fallback.
 *
 * Language resolution: the app persists its active language to IndexedDB
 * (see `sw-language-store.ts` — the SW cannot read cookies/localStorage),
 * falling back to the device language. Changing language in the app therefore
 * changes the language of subsequent push notifications on that device.
 *
 * Contract with the backend (`backend/worker/.../sender/message.rs`):
 * the push payload keeps the legacy pre-rendered `title`/`body` (French)
 * as a fallback for older clients, and carries flat structured fields
 * for localized rendering:
 *
 * ```json
 * {
 *   "title": "Alerte Serveur : ...",
 *   "body": "...",
 *   "icon": "/logo.webp",
 *   "url": "/server/42",
 *   "alertType": "status_to_offline | status_to_online | player_above | player_below",
 *   "serverName": "Mon Serveur",
 *   "threshold": 10,
 *   "current": 15
 * }
 * ```
 *
 * `alertType` intentionally carries the domain value (not an i18n key path):
 * the mapping to `notifications.push.*` keys lives below in
 * `BODY_KEY_BY_ALERT`, so the backend never depends on frontend copy paths.
 */

import { registerTranslations, translate, type Language } from "../core/lib/i18n";
import { PUSH_STRINGS } from "./push-strings.generated";
import { readSwLanguage } from "./sw-language-store";

for (const [lang, push] of Object.entries(PUSH_STRINGS)) {
  registerTranslations(lang as Language, { notifications: { push } });
}

const SUPPORTED_LANGUAGES: ReadonlySet<string> = new Set(Object.keys(PUSH_STRINGS));

type AlertType = "status_to_offline" | "status_to_online" | "player_above" | "player_below";

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  url?: string;
  alertType?: AlertType;
  serverName?: string;
  threshold?: number | string;
  current?: number | string;
}

/** Best-effort locale: the app's language first (persisted via IndexedDB),
 * then the device language (`fr-FR` -> `fr`). Defaults to `en`. */
async function resolveLanguage(): Promise<Language> {
  try {
    const stored = await readSwLanguage();
    if (stored && SUPPORTED_LANGUAGES.has(stored)) return stored as Language;
  } catch {
    // Fall through to the device language.
  }
  const raw =
    (typeof self !== "undefined" && self.navigator && self.navigator.language) || "";
  const tag = raw.toLowerCase().split(/[-_]/)[0];
  if (tag && SUPPORTED_LANGUAGES.has(tag)) return tag as Language;
  return "en";
}

const BODY_KEY_BY_ALERT: Record<AlertType, string> = {
  status_to_offline: "notifications.push.statusToOffline",
  status_to_online: "notifications.push.statusToOnline",
  player_above: "notifications.push.playerAbove",
  player_below: "notifications.push.playerBelow",
};

function renderFromStructured(lang: Language, payload: PushPayload): { title: string; body: string } | null {
  if (!payload.alertType || !(payload.alertType in BODY_KEY_BY_ALERT)) return null;
  const serverName = payload.serverName ?? "";
  return {
    title: translate(lang, "notifications.push.title", { name: serverName }),
    body: translate(lang, BODY_KEY_BY_ALERT[payload.alertType], {
      name: serverName,
      threshold: String(payload.threshold ?? 0),
      current: String(payload.current ?? 0),
    }),
  };
}

self.addEventListener("push", (event) => {
  const pushEvent = event as PushEvent;
  if (!pushEvent.data) return;

  pushEvent.waitUntil(handlePush(pushEvent));
});

// The new SW takes over ASAP (no fetch caching here, nothing to migrate):
// without this, an updated SW stays "waiting" until every tab closes and
// users keep receiving notifications from the previous version.
self.addEventListener("install", (event) => {
  (event as ExtendableEvent).waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  (event as ExtendableEvent).waitUntil(self.clients.claim());
});

async function handlePush(pushEvent: PushEvent): Promise<void> {
  const data = pushEvent.data;
  if (!data) return;

  const lang = await resolveLanguage();
  const fallbackTitle = translate(lang, "notifications.push.fallbackTitle");
  const fallbackBody = translate(lang, "notifications.push.fallbackBody");

  try {
    const payload = data.json() as PushPayload;
    const structured = renderFromStructured(lang, payload);

    const title = structured?.title || payload.title || fallbackTitle;
    const options: NotificationOptions & { badge?: string } = {
      body: structured?.body || payload.body || fallbackBody,
      icon: payload.icon || "/logo.webp",
      badge: payload.badge || "/logo.webp",
      data: {
        url: payload.url || "/",
      },
    };

    await self.registration.showNotification(title, options);
  } catch (e) {
    console.error("Error parsing push payload:", e);
    // Fallback for raw text payloads (kept from the previous SW behavior).
    const text = data.text();
    await self.registration.showNotification(fallbackTitle, {
      body: text,
      icon: "/logo.webp",
      data: { url: "/" },
    });
  }
}

self.addEventListener("notificationclick", (event) => {
  const clickEvent = event as NotificationEvent;
  clickEvent.notification.close();

  const rawUrl = (clickEvent.notification.data as { url?: string } | null)?.url || "/";
  const target = new URL(rawUrl, self.location.origin);

  clickEvent.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus if the exact page is already open.
        for (const client of clientList) {
          const windowClient = client as WindowClient;
          const clientUrl = new URL(windowClient.url);
          if (
            clientUrl.origin === target.origin &&
            clientUrl.pathname === target.pathname &&
            "focus" in windowClient
          ) {
            return windowClient.focus();
          }
        }
        // Otherwise open new window.
        if (self.clients.openWindow) {
          return self.clients.openWindow(target.href);
        }
        return undefined;
      }),
  );
});
