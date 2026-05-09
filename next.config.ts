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
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  fallbacks: {
    // Standalone HTML — NOT a Next.js page, so the client-side router
    // never tries to re-navigate to the original URL after hydration.
    document: "/offline.html",
  },
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
    runtimeCaching: [
      {
        // Cache all app page HTML with NetworkFirst.
        // Online → fetches fresh, caches response.
        // Offline → serves from cache; fallbacks.document kicks in on cache miss.
        // Excludes /_next/ (static assets pre-cached by SW) and /api/ routes.
        urlPattern: /^https?:\/\/[^/]+(?!\/_next)(?!\/api).*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "app-pages",
          networkTimeoutSeconds: 3,
          expiration: { maxEntries: 128, maxAgeSeconds: 86400 },
          cacheableResponse: { statuses: [200] },
        },
      },
    ],
  },
})(nextConfig);
