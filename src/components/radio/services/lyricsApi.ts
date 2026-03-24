/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import type { LyricsData, LrcLibResponse } from '../types';
import { parseLrc } from '../lrcParser';

const LRCLIB_BASE = 'https://lrclib.net/api';

const FETCH_TIMEOUT_MS = 8_000;

function isTransientError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof TypeError) return true; // fetch network failure
  return false;
}

// Fetch with combined cancellation: parent signal (caller abort) + per-request timeout.
// Follows the child-controller pattern used by fetchIcyMeta in useStationMeta.
function fetchWithCancel(url: string, parentSignal?: AbortSignal): Promise<Response> {
  if (!parentSignal) return fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  if (parentSignal.aborted) {
    clearTimeout(timeout);
    controller.abort();
    return fetch(url, { signal: controller.signal }); // will reject immediately
  }
  parentSignal.addEventListener('abort', onParentAbort, { once: true });

  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    parentSignal.removeEventListener('abort', onParentAbort);
  });
}

export async function fetchLyrics(
  artist: string,
  title: string,
  album?: string,
  duration?: number,
  fallbackArtist?: string,
  signal?: AbortSignal,
): Promise<LyricsData | null> {
  const artistCandidates = Array.from(
    new Set(
      [artist, fallbackArtist]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0)),
    ),
  );

  if (!artistCandidates.length || !title?.trim()) return null;

  for (const artistCandidate of artistCandidates) {
    if (signal?.aborted) return null;
    try {
      const match = await fetchLyricsForArtist(artistCandidate, title, album, duration, signal);
      if (match) return match;
    } catch (err) {
      // Re-throw transient errors so useLyrics can retry
      if (isTransientError(err)) throw err;
    }
  }

  return null;
}

async function fetchLyricsForArtist(
  artist: string,
  title: string,
  album?: string,
  duration?: number,
  signal?: AbortSignal,
): Promise<LyricsData | null> {
  const params = new URLSearchParams({
    artist_name: artist,
    track_name: title,
  });
  if (album) params.set('album_name', album);
  if (duration) params.set('duration', String(Math.round(duration)));

  // Exact match
  try {
    const res = await fetchWithCancel(`${LRCLIB_BASE}/get?${params}`, signal);
    if (res.ok) {
      const data: LrcLibResponse = await res.json();
      const lyrics = transform(data, artist, title);
      if (lyrics) return lyrics;
    } else {
      await res.text().catch(() => {}); // drain body to release connection
    }
  } catch (err) {
    if (isTransientError(err)) throw err;
  }

  if (signal?.aborted) return null;

  // Search fallback
  try {
    const res = await fetchWithCancel(
      `${LRCLIB_BASE}/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`,
      signal,
    );
    if (res.ok) {
      const results: LrcLibResponse[] = await res.json();
      if (results.length > 0) {
        const lyrics = transform(results[0], artist, title);
        if (lyrics) return lyrics;
      }
    } else {
      await res.text().catch(() => {}); // drain body to release connection
    }
  } catch (err) {
    if (isTransientError(err)) throw err;
  }

  return null;
}

function transform(data: LrcLibResponse, artist: string, title: string): LyricsData | null {
  if (data.syncedLyrics) {
    return {
      trackName: title,
      artistName: artist,
      synced: true,
      lines: parseLrc(data.syncedLyrics),
    };
  }
  if (data.plainLyrics) {
    return {
      trackName: title,
      artistName: artist,
      synced: false,
      lines: [],
      plainText: data.plainLyrics,
    };
  }
  return null;
}
