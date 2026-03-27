import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { env } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '');
  if (secret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  const topGenres = db
    .select({
      genre: sql<string>`json_extract(${schema.analyticsEvents.properties}, '$.genre')`,
      count: sql<number>`count(*)`,
    })
    .from(schema.analyticsEvents)
    .where(
      sql`${schema.analyticsEvents.event} = 'station_play' AND ${schema.analyticsEvents.createdAt} > ${thirtyDaysAgo}`,
    )
    .groupBy(sql`json_extract(${schema.analyticsEvents.properties}, '$.genre')`)
    .orderBy(sql`count(*) DESC`)
    .limit(10)
    .all();

  const topCountries = db
    .select({
      country: sql<string>`json_extract(${schema.analyticsEvents.properties}, '$.country')`,
      count: sql<number>`count(*)`,
    })
    .from(schema.analyticsEvents)
    .where(
      sql`${schema.analyticsEvents.event} = 'station_play' AND ${schema.analyticsEvents.createdAt} > ${thirtyDaysAgo}`,
    )
    .groupBy(sql`json_extract(${schema.analyticsEvents.properties}, '$.country')`)
    .orderBy(sql`count(*) DESC`)
    .limit(10)
    .all();

  const totalPlays = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.analyticsEvents)
    .where(
      sql`${schema.analyticsEvents.event} = 'station_play' AND ${schema.analyticsEvents.createdAt} > ${thirtyDaysAgo}`,
    )
    .get();

  return NextResponse.json(
    {
      period: '30d',
      topGenres: topGenres.filter((g) => g.genre),
      topCountries: topCountries.filter((c) => c.country),
      totalPlays: totalPlays?.count || 0,
    },
    { headers: { 'Cache-Control': 'private, no-cache' } },
  );
}
