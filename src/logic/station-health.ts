/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { db, schema } from '@/logic/db';
import { eq, sql, inArray } from 'drizzle-orm';

const { stationHealth } = schema;

/** Record a successful stream connection. */
export function recordSuccess(url: string, responseMs: number): void {
  try {
    db.insert(stationHealth)
      .values({
        url,
        successCount: 1,
        failureCount: 0,
        lastSuccess: Date.now(),
        avgResponseMs: Math.round(responseMs),
      })
      .onConflictDoUpdate({
        target: stationHealth.url,
        set: {
          successCount: sql`${stationHealth.successCount} + 1`,
          lastSuccess: Date.now(),
          avgResponseMs: sql`CASE
            WHEN ${stationHealth.avgResponseMs} IS NULL THEN ${Math.round(responseMs)}
            ELSE (${stationHealth.avgResponseMs} * 3 + ${Math.round(responseMs)}) / 4
          END`,
        },
      })
      .run();
  } catch {
    // Non-critical — don't break streaming on health tracking error
  }
}

/** Record a failed stream connection. */
export function recordFailure(url: string): void {
  try {
    db.insert(stationHealth)
      .values({
        url,
        successCount: 0,
        failureCount: 1,
        lastFailure: Date.now(),
      })
      .onConflictDoUpdate({
        target: stationHealth.url,
        set: {
          failureCount: sql`${stationHealth.failureCount} + 1`,
          lastFailure: Date.now(),
        },
      })
      .run();
  } catch {
    // Non-critical
  }
}

/**
 * Get reliability score for a station URL.
 * Returns 0.0–1.0 with recency weighting (recent failures penalize more).
 */
export function getReliabilityScore(url: string): number {
  try {
    const row = db.select().from(stationHealth).where(eq(stationHealth.url, url)).get();
    if (!row) return 0.5; // Unknown station — neutral score
    return computeScore(row);
  } catch {
    return 0.5;
  }
}

/** Filter out stations with reliability < 0.2. */
export function getHealthyStations(urls: string[]): string[] {
  if (urls.length === 0) return [];
  try {
    const rows = db.select().from(stationHealth).where(inArray(stationHealth.url, urls)).all();
    const scoreMap = new Map<string, number>();
    for (const row of rows) {
      scoreMap.set(row.url, computeScore(row));
    }
    return urls.filter((u) => {
      const score = scoreMap.get(u);
      return score === undefined || score >= 0.2; // Unknown stations pass
    });
  } catch {
    return urls;
  }
}

/** Batch get reliability scores. */
export function getScores(urls: string[]): Record<string, number> {
  if (urls.length === 0) return {};
  try {
    const rows = db.select().from(stationHealth).where(inArray(stationHealth.url, urls)).all();
    const result: Record<string, number> = {};
    for (const url of urls) {
      result[url] = 0.5; // default for unknown
    }
    for (const row of rows) {
      result[row.url] = computeScore(row);
    }
    return result;
  } catch {
    return {};
  }
}

/** Check if a station should be considered blacklisted (very low reliability). */
export function isUnhealthy(url: string): boolean {
  try {
    const row = db.select().from(stationHealth).where(eq(stationHealth.url, url)).get();
    if (!row) return false;
    // Blacklisted if score < 0.2 AND at least 3 failures AND last failure < 15 min ago
    const score = computeScore(row);
    const recentFailure = row.lastFailure && (Date.now() - row.lastFailure) < 15 * 60 * 1000;
    return score < 0.2 && row.failureCount >= 3 && !!recentFailure;
  } catch {
    return false;
  }
}

function computeScore(row: {
  successCount: number;
  failureCount: number;
  lastSuccess: number | null;
  lastFailure: number | null;
}): number {
  const total = row.successCount + row.failureCount;
  if (total === 0) return 0.5;

  const baseRatio = row.successCount / total;

  // Recency weighting: recent failures (< 5 min) penalize 2x
  let recencyPenalty = 0;
  if (row.lastFailure) {
    const minutesAgo = (Date.now() - row.lastFailure) / 60_000;
    if (minutesAgo < 5) recencyPenalty = 0.2;
    else if (minutesAgo < 30) recencyPenalty = 0.1;
  }

  return Math.max(0, Math.min(1, baseRatio - recencyPenalty));
}
