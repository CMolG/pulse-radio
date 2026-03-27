---
task_id: ARCH-104
target_agent: auto-feature-engineer-finite
target_module: src/app/api/icy-meta/route.ts
priority: medium
status: pending
---

# ARCH-104: Server-Sent Events for Real-Time ICY Metadata

## Context

Currently, ICY metadata (Now Playing track info) is fetched via **client-side polling** — the frontend calls `/api/icy-meta?url=...` every 10-15 seconds. This creates unnecessary HTTP request overhead: each poll is a full request/response cycle with TCP handshake, even when the metadata hasn't changed. For a user listening to one station for an hour, that's ~240-360 redundant requests.

Server-Sent Events (SSE) would allow the server to push metadata updates only when they change, reducing request volume by ~90% and providing **instant** track change notifications instead of waiting for the next poll interval.

## Directive

1. **New SSE endpoint**: Create `/api/icy-meta-stream/route.ts` that:
   - Accepts a `url` query parameter (the station stream URL).
   - Opens a persistent connection to the station's ICY stream (reusing the existing ICY parsing logic from `/api/icy-meta/route.ts`).
   - Polls the station every 10 seconds server-side.
   - Sends an SSE event **only when the metadata changes** (compare with previous value).
   - Event format: `data: {"title":"Artist - Track","station":"Station Name"}\n\n`
   - Sends a heartbeat comment (`: heartbeat\n\n`) every 30 seconds to keep the connection alive.
   - Closes after 5 minutes of inactivity (configurable via `MAX_SSE_DURATION`).

2. **Apply all existing security checks**: Private IP blocking, URL validation, station blacklist — reuse from the existing `icy-meta` route.

3. **Client-side EventSource**:
   - In the metadata polling logic (currently in RadioShell.tsx), detect `EventSource` support.
   - If supported: use `EventSource` to connect to `/api/icy-meta-stream?url=...`.
   - If not supported (old browsers): fall back to the existing polling approach.
   - Handle `EventSource` errors gracefully — reconnect with exponential backoff (1s, 2s, 4s, max 30s).

4. **Resource limits**:
   - Server-side: Max 1 SSE connection per client IP per station (prevent abuse).
   - Timeout: Close the SSE stream after `maxDuration` (match Vercel/hosting limits).
   - Memory: Do not accumulate events in memory — stream and discard.

5. **Keep the existing polling endpoint** (`/api/icy-meta`) as a fallback. Do not remove it.

## Acceptance Criteria

- [ ] SSE endpoint streams metadata changes in real-time
- [ ] Client receives track change notifications within 1-2 seconds of change
- [ ] Heartbeat keeps the connection alive
- [ ] Connection auto-closes after 5 minutes
- [ ] Fallback to polling works when SSE is unavailable
- [ ] Private IP blocking and URL validation applied
- [ ] No memory leaks from accumulated events
