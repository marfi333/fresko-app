/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
  type PrecacheEntry,
  Serwist,
  type SerwistGlobalConfig,
  StaleWhileRevalidate,
} from "serwist";
import { SYNC_MESSAGE, SYNC_TAG } from "./sync-tag";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

type SyncEvent = ExtendableEvent & {
  tag: string;
  lastChance: boolean;
};

declare const self: ServiceWorkerGlobalScope & {
  addEventListener(type: "sync", listener: (event: SyncEvent) => void): void;
};

const apiGet = new StaleWhileRevalidate({
  cacheName: "fresko-api-get",
});

const apiMutation = new NetworkOnly();

const staticAssets = new CacheFirst({
  cacheName: "fresko-static",
  plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        url.pathname.startsWith("/api/") &&
        request.method === "GET" &&
        !url.pathname.startsWith("/api/auth"),
      handler: apiGet,
    },
    {
      matcher: ({ request, url }) => url.pathname.startsWith("/api/") && request.method !== "GET",
      handler: apiMutation,
    },
    {
      matcher: ({ request }) => ["style", "script", "image", "font"].includes(request.destination),
      handler: staticAssets,
    },
  ],
});

serwist.addEventListeners();

// Background Sync: when the browser fires our sync tag, broadcast a message to
// all clients. Whichever client is open runs the sync runner against its own
// IndexedDB (we deliberately don't duplicate the IDB write logic in the SW).
self.addEventListener("sync", (event) => {
  if (event.tag !== SYNC_TAG) return;
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
      for (const client of clients) {
        client.postMessage({ type: SYNC_MESSAGE });
      }
    })()
  );
});
