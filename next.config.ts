import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: false,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    // Serve the pre-cached app shell ("/" HTML) for any offline navigation
    // that isn't in the runtime cache. Next.js client router reads the real
    // URL and renders the correct page — same pattern as CRA's index.html shell.
    document: "/",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    // Pre-cache "/" at SW install time so it is available immediately offline,
    // even on the very first cold open (before any runtime caching has run).
    additionalManifestEntries: [{ url: "/", revision: null }],
    runtimeCaching: [
      {
        // Cache /api/auth/session so NextAuth's useSession works offline.
        // Without this, session fails to load → shows unauthenticated landing page.
        urlPattern: /^https?:\/\/[^/]+\/api\/auth\/session/,
        handler: "NetworkFirst",
        options: {
          cacheName: "auth-session",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 1, maxAgeSeconds: 604800 }, // 7 days
          cacheableResponse: { statuses: [200] },
        },
      },
      {
        // Cache all app page HTML + RSC payloads with NetworkFirst.
        // ignoreSearch: true strips ?_rsc=... query params from cache keys so
        // prefetched RSC responses are reused for subsequent navigations offline.
        urlPattern: /^https?:\/\/[^/]+(?!\/_next)(?!\/api).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "app-pages",
          networkTimeoutSeconds: 3,
          matchOptions: { ignoreSearch: true },
          expiration: { maxEntries: 128, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
})(nextConfig);
