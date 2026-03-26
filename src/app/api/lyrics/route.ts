/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheResolve } from '@/lib/services/CacheRepository';

export const runtime = 'nodejs';
const LRCLIB_BASE = 'https://lrclib.net/api';
const LRCLIB_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' };
const _NO_CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200' };
const _NOOP = () => {};

interface LrcLibResponse {
  syncedLyrics?: string | null;
  plainLyrics?: string | null;
  trackName?: string;
  artistName?: string;
  albumName?: string;
  duration?: number;
  id?: number;
}

async function fetchLrcLib<T>(url: string, signal: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      await res.text().catch(_NOOP);
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
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

async function fetchLyrics(
  artist: string,
  title: string,
  album: string,
  duration: number | undefined,
): Promise<LrcLibResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LRCLIB_TIMEOUT_MS);
  try {
    const exactParams = new URLSearchParams({ artist_name: artist, track_name: title });
    if (album) exactParams.set('album_name', album);
    if (duration) exactParams.set('duration', `${Math.round(duration)}`);

    let result = await fetchLrcLib<LrcLibResponse>(
      `${LRCLIB_BASE}/get?${exactParams}`,
      controller.signal,
    );

    if (!result?.syncedLyrics && !result?.plainLyrics) {
      const searchResult = await fetchLrcLib<LrcLibResponse[]>(
        `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
        controller.signal,
      );
      result = searchResult?.[0] ?? null;
    }

    const hasLyrics = !!(result?.syncedLyrics || result?.plainLyrics);
    return hasLyrics ? result : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const artist = searchParams.get('artist')?.trim() ?? '';
  const title = searchParams.get('title')?.trim() ?? '';
  const album = searchParams.get('album')?.trim() ?? '';
  const durationParam = searchParams.get('duration');
  const duration = durationParam ? parseFloat(durationParam) : undefined;

  if (!title || title.length > 300 || artist.length > 300) {
    return NextResponse.json({ error: 'Missing or invalid parameters' }, { status: 400 });
  }

  const cacheKey = `${normKey(artist)}|${normKey(title)}`;
  try {
    const result = await cacheResolve<LrcLibResponse | null>({
      namespace: 'lyrics',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      fetcher: () => fetchLyrics(artist, title, album, duration),
    });

    if (!result) return NextResponse.json(null, { headers: _NO_CACHE_HDRS });
    return NextResponse.json(result, { headers: _CACHE_HDRS });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
