/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

const CACHE = "pulse-radio-v2";
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  "/android-chrome-192x192.png",
  "/android-chrome-512x512.png",
];

// API routes eligible for network-first caching (not streaming)
const CACHEABLE_API = ["/api/itunes", "/api/lyrics", "/api/artist-info", "/api/concerts"];
const API_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const STATIC_CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
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

  // Never intercept streaming routes, sw.js, or audio
  if (
    url.pathname === "/api/proxy-stream" ||
    url.pathname === "/api/icy-meta" ||
    url.pathname === "/sw.js" ||
    req.destination === "audio" ||
    url.searchParams.has("url") // proxy-stream and icy-meta use ?url=
  ) {
    return;
  }

  // Cacheable API routes: network-first with cache fallback
  if (CACHEABLE_API.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const clone = fresh.clone();
            // Store with timestamp header for TTL checking
            const headers = new Headers(clone.headers);
            headers.set("X-SW-Cached-At", String(Date.now()));
            const body = await clone.arrayBuffer();
            cache.put(req, new Response(body, { status: clone.status, headers }));
          }
          return fresh;
        } catch {
          const cached = await cache.match(req);
          if (cached) {
            const cachedAt = Number(cached.headers.get("X-SW-Cached-At") || 0);
            if (Date.now() - cachedAt < API_CACHE_TTL) return cached;
          }
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      })(),
    );
    return;
  }

  // Other API routes: pass through to network
  if (url.pathname.startsWith("/api/")) return;

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
            (await cache.match(req)) ||
            (await cache.match("/offline.html")) ||
            new Response("Offline", { status: 503 })
          );
        }
      })(),
    );
    return;
  }

  // Static assets: cache-first with 7-day max age
  if (
    url.origin === self.location.origin &&
    ["image", "style", "script", "font"].includes(req.destination)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(req);
        if (cached) {
          const cachedAt = Number(cached.headers.get("X-SW-Cached-At") || 0);
          if (!cachedAt || Date.now() - cachedAt < STATIC_CACHE_TTL) {
            // Background refresh
            fetch(req).then((res) => {
              if (res.ok) {
                const headers = new Headers(res.headers);
                headers.set("X-SW-Cached-At", String(Date.now()));
                res.arrayBuffer().then((body) => {
                  cache.put(req, new Response(body, { status: res.status, headers }));
                });
              }
            }).catch(() => {});
            return cached;
          }
        }
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const clone = fresh.clone();
            const headers = new Headers(clone.headers);
            headers.set("X-SW-Cached-At", String(Date.now()));
            const body = await clone.arrayBuffer();
            cache.put(req, new Response(body, { status: clone.status, headers }));
          }
          return fresh;
        } catch {
          return cached || new Response("Offline", { status: 503 });
        }
      })(),
    );
  }
});
