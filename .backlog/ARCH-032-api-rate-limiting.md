---
task_id: ARCH-032
target_agent: auto-feature-engineer-finite
target_module: src/lib/rate-limiter.ts
priority: critical
status: completed
---

# Implement API Rate Limiting

## Context

All 7 API routes (`/api/itunes`, `/api/artist-info`, `/api/lyrics`, `/api/concerts`, `/api/proxy-stream`, `/api/icy-meta`, `/api/cron/sync`) are completely unprotected from abuse. There is zero rate limiting. A single malicious actor can:

1. **Exhaust upstream API quotas** — MusicBrainz enforces 1 req/sec; a flood of `/api/artist-info` calls would get the server IP banned.
2. **Saturate the proxy** — `/api/proxy-stream` opens a persistent connection per request. 1000 simultaneous requests = 1000 open sockets.
3. **Fill the SQLite cache** — Unlimited writes to `cache.db` could bloat disk.

CDN `s-maxage` headers provide some implicit protection on cached routes, but direct hits bypass this entirely. This is a **production blocker at scale**.

## Directive

Create a lightweight, in-memory sliding-window rate limiter at `src/lib/rate-limiter.ts`:

1. **Algorithm**: Sliding window counter using a `Map<string, { count: number, windowStart: number }>`. No external dependencies (no Redis needed at current scale — SQLite server is single-instance on VPS).
2. **Key**: Rate limit by IP address (`request.headers.get('x-forwarded-for')` or `request.ip`).
3. **Limits** (per IP, per minute):
   - `/api/proxy-stream`: 10 req/min (each is a long-lived stream)
   - `/api/icy-meta`: 60 req/min (polled every 10s per station)
   - `/api/itunes`: 30 req/min
   - `/api/lyrics`: 30 req/min
   - `/api/artist-info`: 20 req/min (MusicBrainz is slow)
   - `/api/concerts`: 20 req/min
   - `/api/cron/sync`: 2 req/min (already auth-protected)
4. **Response**: Return `429 Too Many Requests` with `Retry-After` header (seconds until window resets).
5. **Integration**: Export a `rateLimit(request, config)` function. Each API route handler calls it at the top of the GET function. If rate limited, return early with 429.
6. **Cleanup**: Periodically evict expired window entries to prevent memory growth (every 60s via a lazy cleanup on each call).

**Boundaries:**
- Do NOT install any npm packages. Use pure in-memory Map.
- Do NOT modify the business logic of any route — only add the rate limit check at the top.
- The rate limiter module must be a single importable utility.
- Include TypeScript types for the config object.

## Acceptance Criteria

- [x] `src/lib/rate-limiter.ts` exists with exported `rateLimit()` function.
- [x] All 7 API routes import and call `rateLimit()` at the top of their handler.
- [x] Exceeding the limit returns HTTP 429 with `Retry-After` header.
- [x] Normal usage (1 user browsing stations) never triggers rate limiting.
- [x] Memory cleanup prevents unbounded Map growth.
- [x] All existing Playwright tests pass (they should not trigger rate limits).
- [x] TypeScript compiles without errors.
