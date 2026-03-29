---
task_id: ARCH-091
target_agent: auto-optimizer-finite
target_module: src/app/api/cron/sync/route.ts
priority: high
status: completed
---

# Add Mutex Lock to Prevent Concurrent Cron Sync Execution

## Context

The cron sync endpoint (`GET /api/cron/sync`) is stateless and processes stale cache keys in a loop. If triggered twice simultaneously (e.g., webhook + scheduler overlap), both requests:

1. Call `getStaleKeys()` and get the **same** list of stale keys.
2. Both fetch from external APIs for the same keys (wasted bandwidth, potential rate limiting).
3. Both call `persistToDb()` with `onConflictDoUpdate` — SQLite WAL handles this safely.
4. **But**: The in-memory Tier 1 cache (`cacheSet()` in server-cache.ts) doesn't have conflict resolution — the last write wins, potentially serving stale data from the slower request.

**Scenario**: Cron fires at 3:00:00 AM. External scheduler also fires at 3:00:01 AM. Both process the same 50 stale keys, doubling API calls and creating a 1-second window where Tier 1 cache may serve inconsistent data.

## Directive

1. **Add a module-level mutex** to prevent concurrent execution:
   ```typescript
   let syncInProgress = false;

   export async function GET(req: NextRequest) {
     if (syncInProgress) {
       return NextResponse.json(
         { error: 'Sync already in progress' },
         { status: 429 }
       );
     }
     syncInProgress = true;
     try {
       // ... existing sync logic
     } finally {
       syncInProgress = false;
     }
   }
   ```

2. **Add a timestamp check** to prevent re-syncing too soon:
   ```typescript
   let lastSyncTimestamp = 0;
   const MIN_SYNC_INTERVAL_MS = 60_000; // 1 minute minimum between syncs

   if (Date.now() - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS) {
     return NextResponse.json(
       { error: 'Too soon since last sync', nextAllowedIn: ... },
       { status: 429 }
     );
   }
   ```

3. **Return sync results** in the response for observability:
   ```json
   {
     "synced": 12,
     "failed": 2,
     "skipped": 0,
     "duration_ms": 4523,
     "next_allowed_at": "2025-01-01T03:01:00Z"
   }
   ```

**Boundaries:**
- Do NOT use file-based or database-based locks (module-level boolean is sufficient for single-process).
- Do NOT change the sync logic itself — only add the concurrency gate.
- The mutex only works within a single Node.js process (fine for pm2 single-instance).
- Return 429 with a Retry-After header for rejected requests.

## Acceptance Criteria

- [ ] Concurrent sync requests return 429 (not double-processed).
- [ ] Minimum 60-second interval between syncs enforced.
- [ ] Response includes sync statistics (synced, failed, duration).
- [ ] `npm run build` passes.
- [ ] Single sync still works normally end-to-end.
