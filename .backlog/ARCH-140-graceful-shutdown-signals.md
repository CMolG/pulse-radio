---
task_id: ARCH-140
target_agent: auto-optimizer-finite
target_module: src/app/api/cron/sync/route.ts
priority: medium
status: completed
---

# ARCH-140: Graceful Shutdown & Signal Handling for Long-Running Operations

## Context

The `/api/cron/sync` route makes multiple external API calls (MusicBrainz, iTunes, Bandsintown) that can take 30+ seconds total. If the Node.js process receives `SIGTERM` during a sync (e.g., PM2 restart, Docker stop, deployment), in-flight requests are not cancelled and incomplete data may be written to SQLite.

ARCH-091 (cron mutex) prevents concurrent runs but doesn't handle mid-run termination. ARCH-135 (Docker) and ARCH-084 (PM2) define the deployment environment but don't address application-level shutdown coordination.

## Directive

1. **Shutdown coordinator** — Create `src/lib/shutdown.ts`:
   - Register `SIGTERM` and `SIGINT` handlers.
   - Maintain a set of active `AbortController` instances.
   - On signal: abort all controllers, wait for pending DB writes (max 10s), then exit.
   - `registerAbortController(controller)` / `unregisterAbortController(controller)` API.

2. **Apply to cron sync**:
   - Register the sync route's `AbortController` with the shutdown coordinator.
   - On abort: skip remaining API calls, commit whatever data was already fetched (partial sync is better than corrupted sync).
   - Log: "Shutdown signal received, completing partial sync."

3. **SQLite graceful close**:
   - On shutdown: call `db.close()` on the better-sqlite3 instance.
   - Flush WAL journal before exit.
   - Prevent new queries during shutdown (reject with "shutting down" error).

4. **PM2/Docker integration**:
   - Document `kill_timeout` in PM2 ecosystem config (ARCH-084): set to 15s to allow graceful shutdown.
   - Document `stop_grace_period` in docker-compose (ARCH-135): set to 15s.

## Acceptance Criteria

- [ ] `SIGTERM` triggers graceful shutdown sequence
- [ ] In-flight API calls aborted on shutdown
- [ ] Pending SQLite writes complete before exit
- [ ] `db.close()` called on shutdown
- [ ] No data corruption from mid-sync termination
- [ ] Shutdown completes within 15 seconds
- [ ] Works with both PM2 and Docker deployments
