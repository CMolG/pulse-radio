---
task_id: ARCH-078
target_agent: auto-optimizer-finite
target_module: src/lib/db/index.ts
priority: medium
status: completed
---

# Add SQLite Connection Resource Protection

## Context

`src/lib/db/index.ts` creates a single global `better-sqlite3` connection with `WAL` mode and `busy_timeout = 5000`. However:

- **No connection health check**: If the SQLite file is deleted, moved, or corrupted, the connection handle becomes stale with no automatic recovery.
- **No graceful shutdown**: The Node.js process (pm2-managed) never calls `db.close()`, which can leave WAL files in an inconsistent state.
- **No query timeout protection**: Individual queries have no execution time limit — a pathological query (e.g., full table scan on a corrupted DB) blocks the event loop indefinitely since better-sqlite3 is synchronous.
- **No database file size monitoring**: The cache DB can grow unboundedly (no max size enforcement).

## Directive

1. **Add a health check function**:
   ```typescript
   export function isDatabaseHealthy(): boolean {
     try {
       db.pragma('integrity_check(1)');
       return true;
     } catch { return false; }
   }
   ```
   Call this from the health check endpoint (ARCH-033).

2. **Add graceful shutdown hooks**:
   ```typescript
   process.on('SIGTERM', () => { db.close(); process.exit(0); });
   process.on('SIGINT', () => { db.close(); process.exit(0); });
   ```

3. **Add database size monitoring**:
   ```typescript
   export function getDatabaseSizeBytes(): number {
     const stat = fs.statSync(DB_PATH);
     return stat.size;
   }
   ```
   Log a warning if the DB exceeds a configurable threshold (default: 100MB).

4. **Add a WAL checkpoint on shutdown**:
   ```typescript
   db.pragma('wal_checkpoint(TRUNCATE)');
   ```
   Run before `db.close()` to merge WAL into main DB file.

**Boundaries:**
- Do NOT implement connection pooling (better-sqlite3 is single-connection by design).
- Do NOT add query timeout (better-sqlite3 doesn't support it; would require worker threads).
- Keep the implementation simple — this is hardening, not a database framework.
- Do NOT change the DB file location or schema.

## Acceptance Criteria

- [ ] `isDatabaseHealthy()` function exported.
- [ ] `SIGTERM` and `SIGINT` handlers close the database cleanly.
- [ ] WAL checkpoint runs before close.
- [ ] `getDatabaseSizeBytes()` function exported.
- [ ] Warning logged if DB exceeds 100MB.
- [ ] `npm run build` passes.
