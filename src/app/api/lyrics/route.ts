/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { NextRequest, NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/services/CacheRepository';
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limiter';
import { sanitizeSearchQuery } from '@/lib/sanitize';
import { validateRequest } from '@/lib/validate-request';
import { lyricsSchema } from '@/lib/validation-schemas';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { lyricsKey } from '@/lib/cache-keys';

export const runtime = 'nodejs';
const LRCLIB_BASE = 'https://lrclib.net/api';
const LRCLIB_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const _CACHE_HDRS = { 'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800' };
const _NO_CACHE_HDRS = { 'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=7200' };
const lyricsCircuit = createCircuitBreaker('lrclib');
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
  const limited = rateLimit(req, RATE_LIMITS.lyrics);
  if (limited) return limited;

  const validated = validateRequest(lyricsSchema, req.nextUrl.searchParams);
  if (!validated.success) return validated.error;
  const artist = sanitizeSearchQuery(validated.data.artist);
  const title = sanitizeSearchQuery(validated.data.title);
  const album = validated.data.album?.trim() ?? '';
  const duration = validated.data.duration;

  const cacheKey = lyricsKey(artist, title);
  try {
    const result = await getCachedOrFetch({
      namespace: 'lyrics',
      key: cacheKey,
      ttlMs: CACHE_TTL_MS,
      schema: LyricsResponseSchema,
      fetcher: async () => {
        const { data } = await lyricsCircuit.call(
          () => fetchLyrics(artist, title, album, duration),
          null,
        );
        return data;
      },
    });

    const headers: Record<string, string> = { ...(!result ? _NO_CACHE_HDRS : _CACHE_HDRS) };
    if (lyricsCircuit.state !== 'CLOSED') headers['X-Circuit-State'] = lyricsCircuit.state.toLowerCase();
    if (!result) return NextResponse.json(null, { headers });
    return NextResponse.json(result, { headers });
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Request timed out' : 'Internal error' },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
