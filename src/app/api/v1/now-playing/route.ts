import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { rateLimit } from '@/lib/rate-limiter';
import { withApiVersion } from '@/lib/api-versioning';

export const runtime = 'nodejs';

const STALENESS_MS = 30 * 60 * 1000; // 30 minutes

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50', 10), 100);
  const genre = req.nextUrl.searchParams.get('genre');
  const cutoff = Date.now() - STALENESS_MS;

  // Cleanup stale entries
  db.delete(schema.nowPlaying)
    .where(sql`${schema.nowPlaying.detectedAt} < ${cutoff}`)
    .run();

  let query = db
    .select()
    .from(schema.nowPlaying)
    .where(sql`${schema.nowPlaying.detectedAt} >= ${cutoff}`)
    .orderBy(sql`${schema.nowPlaying.detectedAt} DESC`)
    .limit(limit);

  if (genre) {
    query = db
      .select()
      .from(schema.nowPlaying)
      .where(
        sql`${schema.nowPlaying.detectedAt} >= ${cutoff} AND ${schema.nowPlaying.genre} LIKE ${'%' + genre + '%'}`,
      )
      .orderBy(sql`${schema.nowPlaying.detectedAt} DESC`)
      .limit(limit);
  }

  const results = query.all();

  return withApiVersion(NextResponse.json(results, {
    headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20' },
  }));
}
