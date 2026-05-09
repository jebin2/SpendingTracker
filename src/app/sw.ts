import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    // Cache the session endpoint so useSession() works offline.
    // Must use a Strategy instance (not a string) — Serwist's constructor
    // only accepts objects with a .handle() method here.
    // No networkTimeoutSeconds: wait as long as needed (handles cold starts).
    {
      matcher: /^https?:\/\/[^/]+\/api\/auth\/session/,
      handler: new NetworkFirst({
        cacheName: "auth-session",
        plugins: [
          new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 604800 }),
          new CacheableResponsePlugin({ statuses: [200] }),
        ],
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
