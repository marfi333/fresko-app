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

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

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
