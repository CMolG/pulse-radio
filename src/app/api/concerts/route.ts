/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/lib/services/CacheRepository';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { logError } from '@/lib/error-logger';
import { validateRequest } from '@/lib/validate-request';
import { concertsSchema } from '@/lib/validation-schemas';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { env } from '@/lib/env';

export const runtime = 'nodejs';
const BANDSINTOWN_BASE = 'https://rest.bandsintown.com';
const TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=14400, s-maxage=43200, stale-while-revalidate=86400' };
const _NO_CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200' };
const _NOOP = () => {};
const MAX_EVENTS = 5;
const concertsCircuit = createCircuitBreaker('bandsintown');

interface BandsintownEvent {
  id: string;
  datetime: string;
  venue: {
    name: string;
    city: string;
    country: string;
    latitude?: string;
    longitude?: string;
  };
  lineup: string[];
  offers?: Array<{ type: string; url: string; status: string }>;
  url?: string;
}

export interface ConcertEvent {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  lineup: string[];
  ticketUrl: string | null;
}

/** Bandsintown requires double-encoding for /, ?, *, " in artist names. */
function encodeBandsintownArtist(name: string): string {
  return encodeURIComponent(name)
    .replace(/%2F/gi, '%252F')
    .replace(/%3F/gi, '%253F')
    .replace(/%2A/gi, '%252A')
    .replace(/%22/gi, '%27C');
}

function normKey(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mapEvent(e: BandsintownEvent): ConcertEvent {
  const ticketOffer = e.offers?.find((o) => o.type === 'Tickets' && o.status === 'available');
  return {
    id: e.id,
    date: e.datetime,
    venue: e.venue.name,
    city: e.venue.city,
    country: e.venue.country,
    lineup: e.lineup ?? [],
    ticketUrl: ticketOffer?.url ?? e.url ?? null,
  };
}

async function fetchConcerts(artist: string): Promise<ConcertEvent[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const encoded = encodeBandsintownArtist(artist);

    // Step 1: Resolve artist to get their canonical ID.
    const artistUrl = `${BANDSINTOWN_BASE}/artists/${encoded}?app_id=${env.BANDSINTOWN_APP_ID}`;
    const artistRes = await fetch(artistUrl, { signal: controller.signal });
    if (!artistRes.ok) {
      const body = await artistRes.text().catch(() => '');
      logError(new Error(`[concerts] artist lookup ${artistRes.status}`), { artist, body: body.slice(0, 200) });
      return [];
    }
    const artistData = await artistRes.json();
    const artistId: string | number | undefined = artistData?.id;

    // Step 2: Fetch events — prefer by ID so name-encoding edge-cases don't matter.
    const eventsPath = artistId
      ? `/artists/id_${artistId}/events`
      : `/artists/${encoded}/events`;
    const eventsUrl = `${BANDSINTOWN_BASE}${eventsPath}?app_id=${env.BANDSINTOWN_APP_ID}&date=upcoming`;
    const res = await fetch(eventsUrl, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logError(new Error(`[concerts] events ${res.status}`), { artist, artistId, body: body.slice(0, 200) });
      return [];
    }
    const cl = res.headers.get('content-length');
    if (cl && parseInt(cl, 10) > 2 * 1024 * 1024) {
      await res.body?.cancel().catch(_NOOP);
      return [];
    }
    const data: BandsintownEvent[] = await res.json();
    if (!Array.isArray(data)) return [];
    return data.slice(0, MAX_EVENTS).map(mapEvent);
  } catch {
    clearTimeout(timer);
    return [];
  }
}

export async function GET(req: NextRequest) {
  const limited = rateLimit(req, RATE_LIMITS.concerts);
  if (limited) return limited;

  const validated = validateRequest(concertsSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;
  const artist = sanitizeSearchQuery(validated.data.artist);
  if (!artist) return NextResponse.json({ error: 'Missing or invalid artist parameter' }, { status: 400 });

  const cacheKey = normKey(artist);
  try {
    const events = await cacheResolve<ConcertEvent[]>({
      namespace: 'concerts',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: async () => {
        const { data } = await concertsCircuit.call(
          () => fetchConcerts(artist),
          [],
        );
        return data;
      },
    });
    const list = events ?? [];
    const headers: Record<string, string> = { ...(list.length > 0 ? _CACHE_HDRS : _NO_CACHE_HDRS) };
    if (concertsCircuit.state !== 'CLOSED') headers['X-Circuit-State'] = concertsCircuit.state.toLowerCase();
    return NextResponse.json(list, { headers });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
