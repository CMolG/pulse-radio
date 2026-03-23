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
const POLL_INTERVAL_MS = 5_000;
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
  streamCodec: string | null;
};

export function useStationMeta(
  station: Station | null,
  isPlaying: boolean,
): UseStationMetaReturn {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const [streamCodec, setStreamCodec] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  // Tracks the URL of the station whose ICY data is currently being polled.
  // Used to distinguish a station change from an isPlaying toggle.
  const prevStationUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!station) {
      setTrack(null);
      setIcyBitrate(null);
      setStreamCodec(null);
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
      if (station.codec) {
        const c = station.codec.toUpperCase();
        const friendly = c === 'MP3' ? 'MP3' : c === 'AAC' || c === 'AAC+' ? 'AAC' :
          c === 'OGG' || c === 'VORBIS' ? 'OGG' : c === 'OPUS' ? 'Opus' :
          c === 'FLAC' ? 'FLAC' : c === 'WMA' ? 'WMA' : c;
        setStreamCodec(friendly);
      }

      if (streamTitle && streamTitle !== lastTitleRef.current) {
        lastTitleRef.current = streamTitle;

        if (isAdContent(streamTitle)) {
          setTrack(null);
          return;
        }

        const parsed = parseTrack(streamTitle, station.name);
        // Only reject if title looks like ad content. Artist names can look like domains.
        if (!parsed || isAdContent(parsed.title)) {
          setTrack(null);
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

    // Fetch immediately on station change or when resuming playback,
    // so we don't wait a full poll interval for fresh metadata.
    if (stationChanged || isPlaying) {
      poll();
    }

    // Continuous polling only while actively playing
    if (isPlaying) {
      intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
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
