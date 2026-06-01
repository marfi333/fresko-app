/// <reference lib="webworker" />
import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
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

// Mutations always hit the network. When offline they throw at the client,
// which our `mutateOrEnqueue` catches and routes to the IDB outbox.
const apiMutation = new NetworkOnly();

const staticAssets = new CacheFirst({
  cacheName: "fresko-static",
  plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
});

// NetworkFirst for HTML/RSC navigations: fastest path is the network; on
// offline (or fetch error), serve the most recently cached version of this
// route. Pages the user has visited become available offline automatically.
const navigation = new NetworkFirst({
  cacheName: "fresko-pages",
  networkTimeoutSeconds: 3,
  plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 })],
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Navigation requests (HTML documents) — keep above the static-assets
    // matcher because navigations have request.destination === "document".
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: navigation,
    },
    // Next.js RSC payload requests for App Router navigations. Detect by the
    // RSC header or the `_rsc` query param Next.js attaches.
    {
      matcher: ({ request, url }) =>
        request.headers.get("RSC") === "1" || url.searchParams.has("_rsc"),
      handler: navigation,
    },
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
