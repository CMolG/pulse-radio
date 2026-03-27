/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
/**
 * Graceful shutdown coordinator (ARCH-140).
 *
 * Centralises SIGTERM / SIGINT handling so that:
 *  - In-flight fetch calls are aborted via registered AbortControllers.
 *  - Pending SQLite writes complete before the DB is closed.
 *  - The process exits within the 15 s kill-timeout budget.
 */

import { closeDb } from '@/lib/db';

const MAX_DRAIN_MS = 10_000;

let shuttingDown = false;
const controllers = new Set<AbortController>();

export function isShuttingDown(): boolean {
  return shuttingDown;
}

export function registerAbortController(c: AbortController): void {
  controllers.add(c);
}

export function unregisterAbortController(c: AbortController): void {
  controllers.delete(c);
}

async function gracefulShutdown(signal: string): Promise<void> {
  if (shuttingDown) return; // prevent re-entry
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received — starting graceful shutdown`);

  // 1. Abort every in-flight HTTP request
  for (const c of controllers) {
    try {
      c.abort();
    } catch { /* best-effort */ }
  }
  controllers.clear();

  // 2. Wait for pending DB writes (drain period)
  await new Promise<void>((resolve) => setTimeout(resolve, Math.min(MAX_DRAIN_MS, 2_000)));

  // 3. Close the database (WAL checkpoint + close)
  closeDb();

  console.log('[shutdown] Cleanup complete — exiting');
  process.exit(0);
}

// Register once — Node deduplicates identical listeners automatically
process.on('SIGTERM', () => { void gracefulShutdown('SIGTERM'); });
process.on('SIGINT', () => { void gracefulShutdown('SIGINT'); });
