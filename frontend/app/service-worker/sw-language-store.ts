/**
 * Minimal bridge between the app and the Service Worker for the UI language.
 *
 * The SW cannot read the `language` cookie or `localStorage`, but it CAN read
 * IndexedDB — so the app persists its active language here and the SW reads
 * it back on each `push` event (offline-friendly, per-device, no backend).
 *
 * Dependency-free on purpose: imported both by the React app (client only)
 * and by the SW bundle (`../sw.ts`). Every function is total: missing or
 * broken IndexedDB (SSR, private mode, tests) degrades to a silent no-op.
 */

const DB_NAME = "mc-stats";
const STORE_NAME = "sw-meta";
const KEY = "language";
const DB_VERSION = 1;

function factory(): IDBFactory | null {
  return typeof indexedDB === "undefined" ? null : indexedDB;
}

function openDb(): Promise<IDBDatabase | null> {
  const idb = factory();
  if (!idb) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = idb.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE_NAME)) {
          req.result.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Fire-and-forget write. Never throws; safe in React effects and SSR. */
export function persistSwLanguage(lang: string): void {
  void openDb().then((db) => {
    if (!db) return;
    try {
      db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(lang, KEY);
    } catch {
      // Best effort: notifications still fall back to the device language.
    }
  });
}

/** Language previously persisted by the app, or `null` when unknown. */
export function readSwLanguage(): Promise<string | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const req = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(KEY);
          req.onsuccess = () => {
            resolve(typeof req.result === "string" ? req.result : null);
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}
