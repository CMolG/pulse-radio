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

const FETCH_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 8_000;
const MAX_TITLE_LENGTH = 500;

function isAdContent(text: string): boolean {
  return AD_PATTERNS.some(re => re.test(text));
}

// Fetch ICY metadata via server-side proxy to avoid CORS issues.
export async function fetchIcyMeta(
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

export function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
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

export function useStationMeta(
  station: Station | null,
  isPlaying: boolean,
  knownDurationMs?: number,
): UseStationMetaReturn {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  const currentTrackKeyRef = useRef<string>('');
  const trackStartedAtRef = useRef<number>(0);
  const skipUntilRef = useRef<number>(0);
  const hasAnchoredStartRef = useRef<boolean>(false);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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

    const resetTrackState = () => {
      currentTrackKeyRef.current = '';
      trackStartedAtRef.current = 0;
      skipUntilRef.current = 0;
    };

    const poll = async () => {
      if (abortController.signal.aborted) return;
      if (document.hidden) return;

      // Smart polling window: skip ICY while current anchored song should still be playing.
      if (skipUntilRef.current > Date.now()) return;

      const { streamTitle, icyBr } = await fetchIcyMeta(station.url_resolved, abortController.signal);
      if (abortController.signal.aborted) return;

      if (icyBr) setIcyBitrate(icyBr);

      if (streamTitle && streamTitle !== lastTitleRef.current) {
        const previousTitle = lastTitleRef.current;
        lastTitleRef.current = streamTitle;

        if (isAdContent(streamTitle)) {
          resetTrackState();
          setTrack(null);
          return;
        }

        const parsed = parseTrack(streamTitle, station.name);
        // Only reject if title looks like ad content. Artist names can look like domains.
        if (!parsed || isAdContent(parsed.title)) {
          resetTrackState();
          setTrack(null);
          return;
        }

        if (previousTitle) {
          // We now have a precise song boundary, so subsequent duration countdown is valid.
          hasAnchoredStartRef.current = true;
        }

        const key = `${parsed.artist}::${parsed.title}`.toLowerCase();
        currentTrackKeyRef.current = key;
        trackStartedAtRef.current = Date.now();
        skipUntilRef.current = 0;
        setTrack(parsed);
        return;
      }

      if (streamTitle) return;

      if (!lastTitleRef.current) {
        setTrack(null);
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      abortController.abort();
    };
  }, [station, isPlaying]);

  // Apply known duration only when start is anchored (second song onward).
  useEffect(() => {
    if (!track || !knownDurationMs || knownDurationMs <= 0) return;
    if (!hasAnchoredStartRef.current) return;

    const key = `${track.artist}::${track.title}`.toLowerCase();
    if (currentTrackKeyRef.current !== key) return;

    const expectedEnd = trackStartedAtRef.current + knownDurationMs;
    if (expectedEnd > Date.now()) {
      skipUntilRef.current = expectedEnd;
    }
  }, [knownDurationMs, track?.title, track?.artist]);

  return { track, icyBitrate };
}
