import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/logic/rate-limiter';
import { db, schema } from '@/logic/db';
import { sql } from 'drizzle-orm';
import { withApiVersion } from '@/logic/api-versioning';
import { apiError } from '@/logic/api-response';
import { StationSchema } from '@/components/radio/schemas';

export const runtime = 'nodejs';

const RETENTION_DAYS = 7;

export async function POST(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const body = await req.json();
    const parsed = StationSchema.safeParse(body?.station);
    if (!parsed.success) {
      return withApiVersion(apiError('Invalid station data', 'INVALID_PARAM', 400));
    }

    const station = parsed.data;
    if (!station.stationuuid || !station.url_resolved) {
      return withApiVersion(apiError('Missing station identifiers', 'INVALID_PARAM', 400));
    }

    db.insert(schema.stationPlays)
      .values({
        stationUuid: station.stationuuid,
        stationName: station.name,
        stationUrl: station.url_resolved,
        stationFavicon: station.favicon || null,
        stationCountry: station.country || null,
        stationCountrycode: station.countrycode || null,
        stationTags: station.tags || null,
        stationCodec: station.codec || null,
        stationBitrate: station.bitrate ?? null,
        playedAt: Date.now(),
      })
      .run();

    // Opportunistic cleanup: purge plays older than RETENTION_DAYS (1% chance)
    if (Math.random() < 0.01) {
      const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
      db.delete(schema.stationPlays)
        .where(sql`${schema.stationPlays.playedAt} < ${cutoff}`)
        .run();
    }

    return withApiVersion(NextResponse.json({ ok: true }, { status: 201 }));
  } catch {
    return withApiVersion(apiError('Invalid request', 'INVALID_PARAM', 400));
  }
}
