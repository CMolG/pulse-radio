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

// Fetch ICY metadata via server-side proxy to avoid CORS issues
async function fetchIcyMeta(streamUrl: string, signal?: AbortSignal): Promise<{ streamTitle: string | null; icyBr: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    // Abort if parent signal fires
    const onParentAbort = () => controller.abort();
    signal?.addEventListener('abort', onParentAbort);

    const res = await fetch(
      `/api/icy-meta?url=${encodeURIComponent(streamUrl)}`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);
    signal?.removeEventListener('abort', onParentAbort);

    if (!res.ok) return { streamTitle: null, icyBr: null };
    const data = await res.json();
    return { streamTitle: data.streamTitle ?? null, icyBr: data.icyBr ?? null };
  } catch {
    return { streamTitle: null, icyBr: null };
  }
}

function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
  if (!raw || raw === stationName || raw.toLowerCase() === stationName.toLowerCase()) return null;

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

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!station || !isPlaying) {
      setTrack(null);
      setIcyBitrate(null);
      lastTitleRef.current = '';
      return;
    }

    const abortController = new AbortController();

    const poll = async () => {
      if (abortController.signal.aborted) return;
      const { streamTitle, icyBr } = await fetchIcyMeta(station.url_resolved, abortController.signal);
      if (abortController.signal.aborted) return;
      if (icyBr) setIcyBitrate(icyBr);
      if (streamTitle && streamTitle !== lastTitleRef.current) {
        if (isAdContent(streamTitle)) {
          return;
        }
        lastTitleRef.current = streamTitle;
        const parsed = parseTrack(streamTitle, station.name);
        if (parsed && (isAdContent(parsed.title) || isAdContent(parsed.artist))) {
          return;
        }
        setTrack(parsed);
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
    };
  }, [station, isPlaying]);

  return { track, icyBitrate };
}
