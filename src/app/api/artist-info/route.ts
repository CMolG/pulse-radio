/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ import {
  NextRequest,
  NextResponse,
} from 'next/server';
import { getCachedOrFetch } from '@/lib/services/CacheRepository';
import { ArtistInfoSchema } from '@/lib/schemas/api-responses';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { logError } from '@/lib/error-logger';
import { validateRequest } from '@/lib/validate-request';
import { artistInfoSchema } from '@/lib/validation-schemas';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { artistInfoKey } from '@/lib/cache-keys';
import { readJsonWithLimit } from '@/lib/fetch-utils';
export const runtime = 'nodejs';
const MB_BASE = 'https://musicbrainz.org/ws/2';
const WIKI_BASE = 'https://en.wikipedia.org/api/rest_v1';
const USER_AGENT = 'PulseRadio/1.0 (https://pulse-radio.online)';
const MUSIC_KEYWORDS =
  /band|singer|musician|artist|rapper|group|duo|dj|producer|composer|vocalist|songwriter|hip.hop|rock|pop|jazz|classical|electronic|country|metal|r&b|soul|blues|funk|reggae|punk|folk/i;
const _PERSON_SUFFIXES = ['(singer)', '(musician)', '(rapper)'] as const;
const _BAND_SUFFIXES = ['(band)', '(musical group)', '(singer)', '(musician)'] as const;
const _ERR_400 = { error: 'Missing or invalid artist parameter' };
const _ERR_500 = { error: 'Internal error' };
const artistInfoCircuit = createCircuitBreaker('artist-info');
const _NOOP = () => {};
const _MB_HDRS = { 'User-Agent': USER_AGENT, Accept: 'application/json' } as const;
const _WIKI_HDRS = { 'User-Agent': USER_AGENT } as const;
async function fetchJson<T>(url: string, headers: Record<string, string>): Promise<T | null> {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      await res.text().catch(_NOOP);
      return null;
    }
    return await readJsonWithLimit<T>(res, 2 * 1024 * 1024, url);
  } catch {
    return null;
  }
}
async function searchMusicBrainz(artist: string) {
  const url = `${MB_BASE}/artist/?query=artist:${encodeURIComponent(artist)}&fmt=json&limit=1`;
  interface ArtistInfo {
    name?: string;
    type?: string;
    country?: string;
    disambiguation?: string;
    'begin-area'?: { name?: string };
    'life-span'?: Record<string, unknown>;
    tags?: Array<{ count: number; name: string }>;
  }
  const data = await fetchJson<{ artists?: ArtistInfo[] }>(url, _MB_HDRS);
  return data?.artists?.[0] ?? null;
}
async function fetchWikiSummary(title: string) {
  const url = `${WIKI_BASE}/page/summary/${encodeURIComponent(title)}`;
  interface WikiData {
    type?: string;
    description?: string;
    extract?: string;
    thumbnail?: { source?: string };
    content_urls?: { desktop?: { page?: string } };
  }
  const data = await fetchJson<WikiData>(url, _WIKI_HDRS);
  if (data?.type === 'disambiguation') return null;
  return data;
}

async function fetchArtistPayload(artist: string) {
  const [mbResult, wikiResult] = await Promise.allSettled([
    searchMusicBrainz(artist),
    fetchWikiSummary(artist),
  ]);
  const mb = mbResult.status === 'fulfilled' ? mbResult.value : null;
  let wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
  if (!wiki || (typeof wiki.description === 'string' && !MUSIC_KEYWORDS.test(wiki.description))) {
    const suffixes = mb?.type === 'Person' ? _PERSON_SUFFIXES : _BAND_SUFFIXES;
    for (const suffix of suffixes) {
      const attempt = await fetchWikiSummary(`${artist} ${suffix}`);
      if (attempt?.extract) {
        wiki = attempt;
        break;
      }
    }
  }
  const tags = (mb?.tags ?? [])
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((t) => t.name);
  return {
    name: mb?.name ?? artist,
    disambiguation: mb?.disambiguation ?? null,
    type: mb?.type ?? null,
    country: mb?.country ?? null,
    beginArea: mb?.['begin-area']?.name ?? null,
    lifeSpan: mb?.['life-span'] ?? null,
    tags,
    bio: wiki?.extract ?? null,
    imageUrl: wiki?.thumbnail?.source ?? null,
    wikipediaUrl: wiki?.content_urls?.desktop?.page ?? null,
  };
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.artistInfo);
  if (limited) return limited;

  const validated = validateRequest(artistInfoSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;
  const artist = sanitizeSearchQuery(validated.data.artist);
  if (!artist) return NextResponse.json(_ERR_400, { status: 400 });
  const cacheKey = artistInfoKey(artist);
  try {
    const payload = await cacheResolve<unknown>({
      namespace: 'artist-info',
      key: cacheKey,
      ttlMs: 24 * 60 * 60 * 1000,
      fetcher: async () => {
        const { data } = await artistInfoCircuit.call(() => fetchArtistPayload(artist), null);
        return data;
      },
    });
    const hasData =
      payload &&
      typeof payload === 'object' &&
      (('bio' in payload && payload.bio) || 'name' in payload);
    const cacheHeader = hasData
      ? 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800'
      : 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200';
    const headers: Record<string, string> = { 'Cache-Control': cacheHeader };
    if (artistInfoCircuit.state !== 'CLOSED')
      headers['X-Circuit-State'] = artistInfoCircuit.state.toLowerCase();
    return NextResponse.json(payload, { headers });
  } catch (err) {
    logError(err instanceof Error ? err : new Error(String(err)), { route: 'artist-info' });
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'timeout' : 'internal' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
