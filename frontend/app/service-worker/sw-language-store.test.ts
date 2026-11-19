import { describe, it, expect, vi, afterEach } from "vitest";
import { persistSwLanguage, readSwLanguage } from "./sw-language-store";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sw-language-store", () => {
  it("degrades to null / no-op without IndexedDB (SSR, tests)", async () => {
    await expect(readSwLanguage()).resolves.toBeNull();
    expect(() => persistSwLanguage("en")).not.toThrow();
    // Let the fire-and-forget write settle.
    await new Promise((r) => setTimeout(r, 10));
  });

  it("round-trips the language through a fake IndexedDB", async () => {
    const backing = new Map<string, unknown>();
    vi.stubGlobal(
      "indexedDB",
      fakeIndexedDB(backing),
    );

    persistSwLanguage("ja");
    await new Promise((r) => setTimeout(r, 10));
    await expect(readSwLanguage()).resolves.toBe("ja");
  });

  it("returns null when nothing was persisted", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDB(new Map()));
    await expect(readSwLanguage()).resolves.toBeNull();
  });
});

/** Minimal fake covering only what the store uses (open/get/put). */
function fakeIndexedDB(backing: Map<string, unknown>) {
  return {
    open: () => {
      const req: Record<string, unknown> = {
        result: {
          objectStoreNames: { contains: () => true },
          createObjectStore: () => {},
          transaction: () => ({
            objectStore: () => ({
              put: (value: unknown, key: string) => {
                backing.set(key, value);
              },
              get: (key: string) => {
                const getReq: Record<string, unknown> = {
                  result: backing.has(key) ? backing.get(key) : null,
                };
                queueMicrotask(() => {
                  (getReq.onsuccess as (() => void) | undefined)?.();
                });
                return getReq;
              },
            }),
          }),
        },
      };
      queueMicrotask(() => {
        (req.onupgradeneeded as (() => void) | undefined)?.();
        (req.onsuccess as (() => void) | undefined)?.();
      });
      return req;
    },
  };
}
