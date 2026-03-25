/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { cacheGet, cacheSet } from '@/lib/server-cache';

export const runtime = 'nodejs';
export const maxDuration = 10;
const LRCLIB_BASE = 'https://lrclib.net/api';
const LRCLIB_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800' };
const _NO_CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' };
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
  const cached = cacheGet<LrcLibResponse | null>('lyrics', cacheKey);
  if (cached !== undefined) {
    if (cached === null) return NextResponse.json(null, { headers: _NO_CACHE_HDRS });
    return NextResponse.json(cached, { headers: _CACHE_HDRS });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LRCLIB_TIMEOUT_MS);

  try {
    // Try exact match first
    const exactParams = new URLSearchParams({ artist_name: artist, track_name: title });
    if (album) exactParams.set('album_name', album);
    if (duration) exactParams.set('duration', `${Math.round(duration)}`);

    let result = await fetchLrcLib<LrcLibResponse>(
      `${LRCLIB_BASE}/get?${exactParams}`,
      controller.signal,
    );

    // If no exact match, try search
    if (!result?.syncedLyrics && !result?.plainLyrics) {
      const searchResult = await fetchLrcLib<LrcLibResponse[]>(
        `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
        controller.signal,
      );
      result = searchResult?.[0] ?? null;
    }

    const hasLyrics = !!(result?.syncedLyrics || result?.plainLyrics);
    cacheSet('lyrics', cacheKey, hasLyrics ? result : null, CACHE_TTL_MS);

    if (!hasLyrics) return NextResponse.json(null, { headers: _NO_CACHE_HDRS });
    return NextResponse.json(result, { headers: _CACHE_HDRS });
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error' },
      { status: isTimeout ? 504 : 500 },
    );
  } finally {
    clearTimeout(timer);
  }
}
