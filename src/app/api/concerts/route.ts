/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/lib/services/CacheRepository';

export const runtime = 'nodejs';
const BANDSINTOWN_APP_ID = 'pulse-radio';
const BANDSINTOWN_BASE = 'https://rest.bandsintown.com';
const TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=14400, s-maxage=43200, stale-while-revalidate=86400' };
const _NO_CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200' };
const _NOOP = () => {};
const MAX_EVENTS = 5;

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
    const url = `${BANDSINTOWN_BASE}/artists/${encodeURIComponent(artist)}/events?app_id=${BANDSINTOWN_APP_ID}&date=upcoming`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) {
      await res.text().catch(_NOOP);
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
  const artist = req.nextUrl.searchParams.get('artist')?.trim() ?? '';
  if (!artist || artist.length > 200) {
    return NextResponse.json({ error: 'Missing or invalid artist parameter' }, { status: 400 });
  }

  const cacheKey = normKey(artist);
  try {
    const events = await cacheResolve<ConcertEvent[]>({
      namespace: 'concerts',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: () => fetchConcerts(artist),
    });
    const list = events ?? [];
    return NextResponse.json(list, { headers: list.length > 0 ? _CACHE_HDRS : _NO_CACHE_HDRS });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
