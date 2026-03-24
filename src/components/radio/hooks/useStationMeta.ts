/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { Station, NowPlayingTrack } from '../types';

const CODEC_MAP: Record<string, string> = {
  MP3: 'MP3', AAC: 'AAC', 'AAC+': 'AAC',
  OGG: 'OGG', VORBIS: 'OGG', OPUS: 'Opus',
  FLAC: 'FLAC', WMA: 'WMA',
};

// Patterns that indicate ads/spam rather than real song metadata
const AD_PATTERNS = [
  /\.(com|net|org|io|co|shop|store|ly|me|us|uk|de|fr|es|it|tv|fm|am)\b/i,
  /^https?:\/\//i,
  /\b(shopify|squarespace|wix|spotify\.com|instagram|facebook|twitter|tiktok|youtube)\b/i,
  /\b(buy now|subscribe|promo|advertisement|advert|commercial|sponsor)\b/i,
  /\b(www\.)/i,
];

const FETCH_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_TITLE_LENGTH = 500;
const _adCache = new Map<string, boolean>();
const MAX_AD_CACHE = 256;

function isAdContent(text: string): boolean {
  let result = _adCache.get(text);
  if (result !== undefined) return result;
  result = AD_PATTERNS.some(re => re.test(text));
  if (_adCache.size >= MAX_AD_CACHE) _adCache.delete(_adCache.keys().next().value!);
  _adCache.set(text, result);
  return result;
}

// Fetch ICY metadata via server-side proxy to avoid CORS issues.
export async function fetchIcyMeta(
  streamUrl: string,
  signal?: AbortSignal,
): Promise<{ streamTitle: string | null; icyBr: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      controller.abort();
    } else {
      const onParentAbort = () => controller.abort();
      signal.addEventListener('abort', onParentAbort, { once: true });
      controller.signal.addEventListener('abort', () => {
        signal.removeEventListener('abort', onParentAbort);
      }, { once: true });
    }
  }

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
  }
}

let _lastStation = '';
let _lastStationLower = '';

export function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
  if (!raw || raw.length > MAX_TITLE_LENGTH) return null;
  if (raw === stationName) return null;
  // Cache lowercase station name to avoid recomputing on every poll
  if (stationName !== _lastStation) { _lastStation = stationName; _lastStationLower = stationName.toLowerCase(); }
  if (raw.toLowerCase() === _lastStationLower) return null;

  // Common separators: " - ", " — ", " – "
  const separators = [' - ', ' — ', ' – ', ' | '];
  for (const sep of separators) {
    const idx = raw.indexOf(sep);
    if (idx > 0) return { artist: raw.slice(0, idx).trim(), title: raw.slice(idx + sep.length).trim() };
  }

  return { title: raw.trim(), artist: '' };
}

export type UseStationMetaReturn = {
  track: NowPlayingTrack | null;
  icyBitrate: string | null;
  streamCodec: string | null;
};

export function useStationMeta(station: Station | null, isPlaying: boolean): UseStationMetaReturn {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const [streamCodec, setStreamCodec] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  // Tracks the URL of the station whose ICY data is currently being polled.
  // Used to distinguish a station change from an isPlaying toggle.
  const prevStationUrlRef = useRef<string | null>(null);

  // Clear track state during render when station goes null (avoid setState in effect)
  const [prevStationId, setPrevStationId] = useState(station?.url_resolved ?? null);
  const currentStationId = station?.url_resolved ?? null;
  if (currentStationId !== prevStationId) {
    setPrevStationId(currentStationId);
    if (!station) {
      setTrack(null);
      setIcyBitrate(null);
      setStreamCodec(null);
    }
  }

  useEffect(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }

    if (!station) {
      lastTitleRef.current = '';
      prevStationUrlRef.current = null;
      return;
    }

    const stationChanged = station.url_resolved !== prevStationUrlRef.current;
    if (stationChanged) {
      prevStationUrlRef.current = station.url_resolved;
      lastTitleRef.current = '';
      // Intentionally NOT clearing track/icyBitrate/streamCodec here.
      // The previous station's data stays visible until the new station's
      // first ICY response arrives — this is the "ICY swap" for smooth transitions.
    }

    const abortController = new AbortController();
    const poll = async () => {
      if (abortController.signal.aborted) return;
      if (document.hidden) return;

      const { streamTitle, icyBr } = await fetchIcyMeta(station.url_resolved, abortController.signal);
      if (abortController.signal.aborted) return;

      if (icyBr) setIcyBitrate(icyBr);

      // Derive codec from station data for display
      if (station.codec) { const c = station.codec.toUpperCase(); setStreamCodec(CODEC_MAP[c] ?? c); }

      if (streamTitle && streamTitle !== lastTitleRef.current) {
        lastTitleRef.current = streamTitle;
        // Reject ad content in raw title or parsed title (artist names may look like domains)
        const parsed = !isAdContent(streamTitle) ? parseTrack(streamTitle, station.name) : null;
        setTrack(parsed && !isAdContent(parsed.title) ? parsed : null);
        return;
      }

      if (streamTitle) return;

      if (!lastTitleRef.current) setTrack(null);
    };

    // Fetch immediately on station change or when resuming playback,
    // so we don't wait a full poll interval for fresh metadata.
    if (stationChanged || isPlaying) poll();

    // Continuous polling only while actively playing
    if (isPlaying) intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    // When the tab returns from background, poll immediately so the user
    // doesn't see stale metadata for up to POLL_INTERVAL_MS.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isPlaying) poll();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      abortController.abort();
    };
  }, [station, isPlaying]);

  return {
    // Keep showing track/bitrate as long as a station is selected.
    // We do NOT null these out while loading — the ICY swap keeps the
    // previous station's data visible until new data arrives.
    track: station ? track : null,
    icyBitrate: station ? icyBitrate : null,
    streamCodec: station ? streamCodec : null,
  };
}
