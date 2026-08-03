import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { VitePWA } from "vite-plugin-pwa";

const rawPort = process.env.PORT;
const isBuild = process.argv.includes("build");

if (!rawPort && !isBuild) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort ?? "18245");

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  define: {
    /* Ensure the production API base URL is always baked into the bundle
       even when VITE_API_BASE_URL env-var is missing or empty at build time. */
    /* Empty string → relative /api/* paths → Nexus proxy → bundled Express API */
    "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
      process.env.VITE_API_BASE_URL || ""
    ),
  },
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    /* ── PWA / Service Worker ────────────────────────────────────────
       • Precaches every JS/CSS chunk so the app shell loads instantly
         on repeat visits and works offline.
       • NetworkFirst for /api/* so API calls always try the network
         first but fall back to cache on failure.
       • CacheFirst for static assets (chunks, fonts, images) with a
         1-year TTL — safe because Vite hashes every filename.
    ────────────────────────────────────────────────────────────────── */
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "favicon.png", "apple-touch-icon.png", "olcha-logo.png"],
      manifest: false, // use existing public/manifest.json
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,ttf,svg,png,jpg,webp}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        runtimeCaching: [
          {
            // API calls — NetworkFirst: try live, fall back to cache
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkFirst",
            options: {
              cacheName: "gilos-api-v1",
              networkTimeoutSeconds: 8,
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 }, // 1 hour
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // R2 / CDN media — CacheFirst: image won't change once uploaded
            urlPattern: /^https:\/\/media\.olchaai\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "gilos-media-v1",
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 }, // 30 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts / any external font
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "gilos-fonts-v1",
              expiration: { maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false }, // never register SW in dev
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    include: ["@emoji-mart/react", "@emoji-mart/data"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "v2-react":    ["react", "react-dom"],
          "v2-motion":   ["framer-motion"],
          "v2-query":    ["@tanstack/react-query"],
          "v2-icons":    ["lucide-react"],
          "v2-i18n":     ["i18next", "react-i18next"],
          "v2-router":   ["wouter"],
        },
      },
    },
    chunkSizeWarningLimit: 300,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
