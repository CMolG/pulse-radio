import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/logic/db';
import { sql } from 'drizzle-orm';
import { rateLimit } from '@/logic/rate-limiter';
import { withApiVersion } from '@/logic/api-versioning';

export const runtime = 'nodejs';

const STALENESS_MS = 60 * 60 * 1000; // 1 hour for trending

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

  const cutoff = Date.now() - STALENESS_MS;

  // Aggregate most-played song titles across stations
  const trending = db
    .select({
      streamTitle: schema.nowPlaying.streamTitle,
      stationCount: sql<number>`count(*)`,
      stations: sql<string>`group_concat(${schema.nowPlaying.stationName}, ', ')`,
    })
    .from(schema.nowPlaying)
    .where(sql`${schema.nowPlaying.detectedAt} >= ${cutoff}`)
    .groupBy(schema.nowPlaying.streamTitle)
    .orderBy(sql`count(*) DESC`)
    .limit(20)
    .all();

  // Parse "Artist - Title" format
  const results = trending.map((t) => {
    const parts = t.streamTitle.split(' - ');
    return {
      title: parts.length > 1 ? parts.slice(1).join(' - ') : t.streamTitle,
      artist: parts.length > 1 ? parts[0] : 'Unknown',
      stationCount: t.stationCount,
      stations: t.stations.split(', ').slice(0, 5),
    };
  });

  return withApiVersion(NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
  }));
}
