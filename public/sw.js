/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

const CACHE = "pulse-radio-v1";
const STATIC_ASSETS = [
  "/offline.html",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

const MAX_CACHE_ENTRIES = 150;

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)),
      );
      // Trim stale entries from old deployments (hashed Next.js assets accumulate)
      const cache = await caches.open(CACHE);
      const entries = await cache.keys();
      if (entries.length > MAX_CACHE_ENTRIES) {
        const toDelete = entries.slice(0, entries.length - MAX_CACHE_ENTRIES);
        await Promise.all(toDelete.map((r) => cache.delete(r)));
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never intercept API routes or audio streams — they must always hit the network
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname === "/sw.js" ||
    req.destination === "audio" ||
    url.searchParams.has("url") // proxy-stream and icy-meta use ?url=
  ) {
    return;
  }

  // HTML navigation: network-first with offline fallback
  if (
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html")
  ) {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (
            (await cache.match("/offline.html")) ||
            new Response("Offline", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  // Static assets: stale-while-revalidate (serve cached, refresh in background)
  if (
    url.origin === self.location.origin &&
    ["image", "style", "script", "font"].includes(req.destination)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        const fetchPromise = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        if (cached) {
          void fetchPromise; // refresh in background
          return cached;
        }
        const fresh = await fetchPromise;
        return fresh || new Response("Offline", { status: 503 });
      })(),
    );
  }
});
