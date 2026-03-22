/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Station, NowPlayingTrack } from '../types';

// Patterns that indicate ads/spam rather than real song metadata
const AD_PATTERNS = [
  /\.(com|net|org|io|co|shop|store|ly|me|us|uk|de|fr|es|it|tv|fm|am)\b/i,
  /^https?:\/\//i,
  /\b(shopify|squarespace|wix|spotify\.com|instagram|facebook|twitter|tiktok|youtube)\b/i,
  /\b(buy now|subscribe|promo|advertisement|advert|commercial|sponsor)\b/i,
  /\b(www\.)/i,
];

function isAdContent(text: string): boolean {
  return AD_PATTERNS.some(re => re.test(text));
}

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TITLE_LENGTH = 500;

// Fetch ICY metadata via server-side proxy to avoid CORS issues.
async function fetchIcyMeta(
  streamUrl: string,
  signal?: AbortSignal,
): Promise<{ streamTitle: string | null; icyBr: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    const res = await fetch(
      `/api/icy-meta?url=${encodeURIComponent(streamUrl)}`,
      { signal: controller.signal },
    );
    if (!res.ok) return { streamTitle: null, icyBr: null };
    const data = await res.json();
    return { streamTitle: data.streamTitle ?? null, icyBr: data.icyBr ?? null };
  } catch {
    return { streamTitle: null, icyBr: null };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

// Look up song duration from iTunes. Used only after we have an anchored start
// (second song onward) to reduce unnecessary ICY polling.
async function fetchTrackDurationMs(
  title: string,
  artist: string,
  signal?: AbortSignal,
): Promise<number | null> {
  const term = `${artist} ${title}`.trim();
  if (!term) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort);

  try {
    const res = await fetch(`/api/itunes?term=${encodeURIComponent(term)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const result = data?.results?.[0];
    const duration = result?.trackTimeMillis;
    return typeof duration === 'number' && duration > 0 ? duration : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
  if (!raw || raw.length > MAX_TITLE_LENGTH) return null;
  if (raw === stationName || raw.toLowerCase() === stationName.toLowerCase()) return null;

  // Common separators: " - ", " — ", " – "
  const separators = [' - ', ' — ', ' – ', ' | '];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) {
      return {
        artist: raw.slice(0, idx).trim(),
        title: raw.slice(idx + sep.length).trim(),
      };
    }
  }

  return { title: raw.trim(), artist: '' };
}

export type UseStationMetaReturn = {
  track: NowPlayingTrack | null;
  icyBitrate: string | null;
};

export function useStationMeta(station: Station | null, isPlaying: boolean): UseStationMetaReturn {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  const currentTrackKeyRef = useRef<string>('');
  const trackStartedAtRef = useRef<number>(0);
  const skipUntilRef = useRef<number>(0);
  const hasAnchoredStartRef = useRef<boolean>(false);
  const durationAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    durationAbortRef.current?.abort();
    durationAbortRef.current = null;

    if (!station || !isPlaying) {
      setTrack(null);
      setIcyBitrate(null);
      lastTitleRef.current = '';
      currentTrackKeyRef.current = '';
      trackStartedAtRef.current = 0;
      skipUntilRef.current = 0;
      hasAnchoredStartRef.current = false;
      return;
    }

    const abortController = new AbortController();

    const poll = async () => {
      if (abortController.signal.aborted) return;
      if (skipUntilRef.current > Date.now()) return;

      const { streamTitle, icyBr } = await fetchIcyMeta(station.url_resolved, abortController.signal);
      if (abortController.signal.aborted) return;
      if (icyBr) setIcyBitrate(icyBr);

      if (streamTitle && streamTitle !== lastTitleRef.current) {
        const previousTitle = lastTitleRef.current;

        if (isAdContent(streamTitle)) {
          lastTitleRef.current = streamTitle;
          currentTrackKeyRef.current = '';
          trackStartedAtRef.current = 0;
          skipUntilRef.current = 0;
          durationAbortRef.current?.abort();
          setTrack(null);
          return;
        }

        lastTitleRef.current = streamTitle;
        const parsed = parseTrack(streamTitle, station.name);
        // Artist-only ad patterns produce false positives for valid names like
        // "will.i.am", so only evaluate title text here.
        if (parsed && isAdContent(parsed.title)) {
          currentTrackKeyRef.current = '';
          trackStartedAtRef.current = 0;
          skipUntilRef.current = 0;
          durationAbortRef.current?.abort();
          setTrack(null);
          return;
        }

        if (!parsed) {
          currentTrackKeyRef.current = '';
          trackStartedAtRef.current = 0;
          skipUntilRef.current = 0;
          durationAbortRef.current?.abort();
          setTrack(null);
          return;
        }

        if (previousTitle) {
          hasAnchoredStartRef.current = true;
        }

        const key = `${parsed.artist}::${parsed.title}`.toLowerCase();
        currentTrackKeyRef.current = key;
        trackStartedAtRef.current = Date.now();
        skipUntilRef.current = 0;
        setTrack(parsed);

        // Smart polling starts only when we know the exact song start time.
        // First detected song after tune-in has unknown start, so we keep
        // normal ICY polling until the first transition occurs.
        if (hasAnchoredStartRef.current) {
          durationAbortRef.current?.abort();
          const durationController = new AbortController();
          durationAbortRef.current = durationController;

          const durationMs = await fetchTrackDurationMs(
            parsed.title,
            parsed.artist,
            durationController.signal,
          );
          if (durationController.signal.aborted) return;
          if (!durationMs || durationMs <= 0) return;
          if (currentTrackKeyRef.current !== key) return;

          const expectedEnd = trackStartedAtRef.current + durationMs;
          if (expectedEnd > Date.now()) {
            skipUntilRef.current = expectedEnd;
          }
        }
        return;
      }

      if (streamTitle) return;

      if (!lastTitleRef.current) {
        setTrack(null);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, 8_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortController.abort();
      durationAbortRef.current?.abort();
      durationAbortRef.current = null;
    };
  }, [station, isPlaying]);

  return { track, icyBitrate };
}
