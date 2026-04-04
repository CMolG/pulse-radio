import { NextRequest, NextResponse } from 'next/server';
import { db, schema } from '@/logic/db';
import { sql } from 'drizzle-orm';
import { rateLimit } from '@/logic/rate-limiter';
import { withApiVersion } from '@/logic/api-versioning';
import { cacheGet, cacheSet } from '@/logic/server-cache';
import { isStationBlacklisted, recordStationFailure } from '@/logic/server-cache';
import { sanitizeTextContent, sanitizeUrl } from '@/logic/sanitize';
import { isPrivateHost, ALLOWED_PROTOCOLS } from '@/logic/ssrf';
import { fetchWithRetry } from '@/logic/fetch-with-retry';
import type { Station } from '@/components/radio/schemas';

export const runtime = 'nodejs';

const _NOOP = () => {};
const _TRAILING_NULLS_RE = /\0+$/;
const _STREAM_TITLE_RE = /StreamTitle='([^']*)'/;
const _UTF8_DECODER = new TextDecoder('utf-8');
const _ICY_FETCH_HDRS = { 'Icy-MetaData': '1' } as const;

// Time-bucket weights for popularity scoring (approximates exponential decay)
const NOW = () => Date.now();
const H1 = 1 * 60 * 60 * 1000;
const H3 = 3 * 60 * 60 * 1000;
const H6 = 6 * 60 * 60 * 1000;
const H12 = 12 * 60 * 60 * 1000;
const H24 = 24 * 60 * 60 * 1000;

const POPULAR_CACHE_TTL_MS = 60_000; // 60s for the ranked list
const ICY_CACHE_TTL_MS = 15_000; // 15s per-station ICY cache

type PopularRow = {
  stationUuid: string;
  stationName: string;
  stationUrl: string;
  stationFavicon: string | null;
  stationCountry: string | null;
  stationCountrycode: string | null;
  stationTags: string | null;
  stationCodec: string | null;
  stationBitrate: number | null;
  score: number;
};

type LiveTrack = { title: string; artist: string } | null;

/** Fetch ICY metadata for a stream URL. Returns null on failure. */
async function fetchIcyForStation(streamUrl: string): Promise<string | null> {
  const cacheKey = `icy:${streamUrl}`;
  const cached = cacheGet<string | null>('popular-icy', cacheKey);
  if (cached !== undefined) return cached;

  if (isStationBlacklisted(streamUrl)) return null;

  const sanitized = sanitizeUrl(streamUrl);
  if (!sanitized) return null;

  try {
    const url = new URL(sanitized);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    if (isPrivateHost(url.hostname)) return null;
  } catch {
    return null;
  }

  const controller = new AbortController();
  try {
    const res = await fetchWithRetry(sanitized, {
      timeout: 6000,
      retries: 1,
      init: { headers: _ICY_FETCH_HDRS },
      signal: controller.signal,
    });

    if (!res.url || !res.ok) {
      res.body?.cancel().catch(_NOOP);
      if (!res.ok) recordStationFailure(sanitized);
      cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
      return null;
    }

    // Check redirect target isn't private
    try {
      if (isPrivateHost(new URL(res.url).hostname)) {
        res.body?.cancel().catch(_NOOP);
        return null;
      }
    } catch {
      /* ignore */
    }

    const icyMetaint = res.headers.get('icy-metaint');
    if (!icyMetaint || !res.body) {
      res.body?.cancel().catch(_NOOP);
      cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
      return null;
    }

    const metaint = parseInt(icyMetaint, 10);
    const MAX_METAINT = 131072;
    if (isNaN(metaint) || metaint <= 0 || metaint > MAX_METAINT) {
      res.body.cancel().catch(_NOOP);
      cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
      return null;
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalRead = 0;
    const bytesNeeded = metaint + 4096;
    try {
      while (totalRead < bytesNeeded) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        chunks.push(value);
        totalRead += value.length;
      }
    } finally {
      reader.cancel().catch(_NOOP);
    }

    const buffer = new Uint8Array(totalRead);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    if (buffer.length <= metaint) {
      cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
      return null;
    }

    const metaLength = buffer[metaint] * 16;
    if (metaLength === 0 || buffer.length < metaint + 1 + metaLength) {
      cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
      return null;
    }

    const metaBytes = buffer.slice(metaint + 1, metaint + 1 + metaLength);
    const metaString = _UTF8_DECODER.decode(metaBytes).replace(_TRAILING_NULLS_RE, '');
    const match = metaString.match(_STREAM_TITLE_RE);
    const streamTitle = match?.[1]?.trim() || null;
    cacheSet('popular-icy', cacheKey, streamTitle, ICY_CACHE_TTL_MS);
    return streamTitle;
  } catch {
    cacheSet('popular-icy', cacheKey, null, ICY_CACHE_TTL_MS);
    return null;
  }
}

/** Parse "Artist - Title" ICY stream title into a track object. */
function parseStreamTitle(raw: string, stationName: string): LiveTrack {
  if (!raw || raw === stationName) return null;
  const SEPS = [' - ', ' — ', ' – ', ' | '];
  for (const sep of SEPS) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      return {
        artist: sanitizeTextContent(raw.slice(0, idx).trim()),
        title: sanitizeTextContent(raw.slice(idx + sep.length).trim()),
      };
    }
  }
  return { title: sanitizeTextContent(raw.trim()), artist: '' };
}

/** Compute top 10 stations using time-bucket weighted popularity scores. */
function computePopularStations(): PopularRow[] {
  const cached = cacheGet<PopularRow[]>('popular-stations', 'top10');
  if (cached) return cached;

  const now = NOW();
  const t1h = now - H1;
  const t3h = now - H3;
  const t6h = now - H6;
  const t12h = now - H12;
  const t24h = now - H24;

  const rows = db
    .select({
      stationUuid: schema.stationPlays.stationUuid,
      stationName: schema.stationPlays.stationName,
      stationUrl: schema.stationPlays.stationUrl,
      stationFavicon: schema.stationPlays.stationFavicon,
      stationCountry: schema.stationPlays.stationCountry,
      stationCountrycode: schema.stationPlays.stationCountrycode,
      stationTags: schema.stationPlays.stationTags,
      stationCodec: schema.stationPlays.stationCodec,
      stationBitrate: schema.stationPlays.stationBitrate,
      score: sql<number>`
        SUM(
          CASE
            WHEN ${schema.stationPlays.playedAt} >= ${t1h}  THEN 8.0
            WHEN ${schema.stationPlays.playedAt} >= ${t3h}  THEN 4.0
            WHEN ${schema.stationPlays.playedAt} >= ${t6h}  THEN 2.0
            WHEN ${schema.stationPlays.playedAt} >= ${t12h} THEN 1.0
            ELSE 0.5
          END
        )
      `,
    })
    .from(schema.stationPlays)
    .where(sql`${schema.stationPlays.playedAt} >= ${t24h}`)
    .groupBy(schema.stationPlays.stationUuid)
    .orderBy(sql`score DESC`)
    .limit(10)
    .all() as PopularRow[];

  cacheSet('popular-stations', 'top10', rows, POPULAR_CACHE_TTL_MS);
  return rows;
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, { limit: 30, windowMs: 60_000 });
  if (limited) return limited;

  const rows = computePopularStations();

  if (rows.length === 0) {
    return withApiVersion(
      NextResponse.json([], {
        headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=15' },
      }),
    );
  }

  // Fetch ICY metadata for all stations in parallel
  const icyResults = await Promise.allSettled(rows.map((r) => fetchIcyForStation(r.stationUrl)));

  const result = rows.map((row, i) => {
    const icyRaw = icyResults[i].status === 'fulfilled' ? icyResults[i].value : null;
    const liveTrack = icyRaw ? parseStreamTitle(icyRaw, row.stationName) : null;

    const station: Station = {
      stationuuid: row.stationUuid,
      name: row.stationName,
      url_resolved: row.stationUrl,
      favicon: row.stationFavicon ?? '',
      country: row.stationCountry ?? '',
      countrycode: row.stationCountrycode ?? '',
      tags: row.stationTags ?? '',
      codec: row.stationCodec ?? '',
      bitrate: row.stationBitrate ?? 0,
      votes: 0,
    };

    return { station, score: row.score, liveTrack };
  });

  return withApiVersion(
    NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=15' },
    }),
  );
}
