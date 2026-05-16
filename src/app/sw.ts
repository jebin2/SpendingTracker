import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist, NetworkFirst, NetworkOnly, ExpirationPlugin, CacheableResponsePlugin } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── Background Sync — flush IndexedDB queue when connectivity returns ─────────

async function flushQueueFromSW(): Promise<void> {
  return new Promise((resolve) => {
    const openReq = indexedDB.open("FundsFleeOffline", 2);
    openReq.onerror = () => resolve();
    openReq.onsuccess = async () => {
      const db = openReq.result;
      const tx = db.transaction(["queue", "conflicts"], "readwrite");
      const queueStore    = tx.objectStore("queue");
      const conflictStore = tx.objectStore("conflicts");

      const ops: { id: number; method: string; url: string; body: string; created_at: number }[] =
        await new Promise((res, rej) => {
          const req = queueStore.getAll();
          req.onsuccess = () => res(req.result);
          req.onerror   = () => rej(req.error);
        });

      ops.sort((a, b) => a.created_at - b.created_at);

      for (const op of ops) {
        try {
          const res = await fetch(op.url, {
            method:  op.method,
            headers: { "Content-Type": "application/json" },
            body:    op.body === "null" ? undefined : op.body,
          });

          if (res.ok) {
            queueStore.delete(op.id);
            continue;
          }
          if (res.status === 401 || res.status === 403) break; // auth expired — stop
          if (res.status >= 400 && res.status < 500) {
            // Client error — record conflict and discard
            conflictStore.add({ method: op.method, url: op.url, body: op.body, statusCode: res.status, failed_at: Date.now() });
            queueStore.delete(op.id);
            continue;
          }
          break; // 5xx — stop, retry next sync
        } catch {
          break; // Network gone again
        }
      }

      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror    = () => { db.close(); resolve(); };
    };
  });
}

// ── Push notifications ─────────────────────────────────────────────────────

self.addEventListener("push", (event) => {
  const data = (event as PushEvent).data?.json() as {
    title?: string; body?: string; tag?: string; url?: string;
  } ?? {};

  (event as ExtendableEvent).waitUntil(
    self.registration.showNotification(data.title ?? "FundsFlee", {
      body:  data.body ?? "",
      icon:  "/icon-192.png",
      badge: "/icon-192.png",
      tag:   data.tag ?? "fundsflee",
      data:  { url: data.url ?? "/transactions" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  (event as NotificationEvent).notification.close();
  const url = ((event as NotificationEvent).notification.data?.url as string | undefined) ?? "/transactions";
  (event as ExtendableEvent).waitUntil(self.clients.openWindow(url));
});

// ── Serwist setup ─────────────────────────────────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
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
    {
      matcher: /^https?:\/\/[^/]+\/api\//,
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request }: { request: Request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "pages",
        plugins: [
          new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
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
        matcher({ request }: { request: Request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// Register Background Sync handler AFTER serwist so it runs alongside SW lifecycle
self.addEventListener("sync", (event) => {
  if ((event as SyncEvent).tag === "flush-queue") {
    (event as ExtendableEvent).waitUntil(flushQueueFromSW());
  }
});
