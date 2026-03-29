import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/logic/rate-limiter';
import { db, schema } from '@/logic/db';
import { sql } from 'drizzle-orm';
import { withApiVersion } from '@/logic/api-versioning';
import { apiError } from '@/logic/api-response';

export const runtime = 'nodejs';

const VALID_EVENTS = new Set([
  'station_play',
  'station_stop',
  'search',
  'favorite_add',
  'favorite_remove',
  'page_view',
]);

const RETENTION_DAYS = 90;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 60, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const events = Array.isArray(body) ? body : [body];

    const now = Date.now();
    let inserted = 0;

    for (const entry of events.slice(0, 20)) {
      if (!entry.event || !VALID_EVENTS.has(entry.event)) continue;

      // Strip any PII — only allow genre, country, codec
      const safeProps: Record<string, string> = {};
      if (typeof entry.properties === 'object' && entry.properties) {
        for (const key of ['genre', 'country', 'codec']) {
          if (typeof entry.properties[key] === 'string') {
            safeProps[key] = entry.properties[key].slice(0, 100);
          }
        }
      }

      db.insert(schema.analyticsEvents)
        .values({
          event: entry.event,
          properties: JSON.stringify(safeProps),
          createdAt: now,
        })
        .run();
      inserted++;
    }

    // Opportunistic cleanup: purge old events (1% chance per request)
    if (Math.random() < 0.01) {
      const cutoff = now - RETENTION_DAYS * 24 * 60 * 60 * 1000;
      db.delete(schema.analyticsEvents)
        .where(sql`${schema.analyticsEvents.createdAt} < ${cutoff}`)
        .run();
    }

    return withApiVersion(NextResponse.json({ inserted }, { status: 201 }));
  } catch {
    return withApiVersion(apiError('Invalid request', 'INVALID_PARAM', 400));
  }
}
