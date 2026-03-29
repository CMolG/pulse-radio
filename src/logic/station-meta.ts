/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { LRU } from '@/logic/audio-context';
import type { NowPlayingTrack } from '@/components/radio/constants';

// ── Constants ────────────────────────────────────────────────────────────────

export const CODEC_MAP: Record<string, string> = {
  MP3: 'MP3',
  AAC: 'AAC',
  'AAC+': 'AAC',
  OGG: 'OGG',
  VORBIS: 'OGG',
  OPUS: 'Opus',
  FLAC: 'FLAC',
  WMA: 'WMA',
};

const AD_PATTERNS = [
  /\.(com|net|org|io|co|shop|store|ly|me|us|uk|de|fr|es|it|tv|fm|am)\b/i,
  /^https?:\/\//i,
  /\b(shopify|squarespace|wix|spotify\.com|instagram|facebook|twitter|tiktok|youtube)\b/i,
  /\b(buy now|subscribe|promo|advertisement|advert|commercial|sponsor)\b/i,
  /\b(www\.)/i,
];

export const STATION_META_FETCH_TIMEOUT_MS = 10_000;
export const POLL_INTERVAL_MS = 10_000;
const MAX_TITLE_LENGTH = 500;

const _EVT_ONCE: AddEventListenerOptions = { once: true };
const _IOS_UA_RE = /iPad|iPhone|iPod/;

// ── Ad detection ─────────────────────────────────────────────────────────────

const _adCache = new LRU<boolean>(256);

export function isAdContent(text: string): boolean {
  const cached = _adCache.get(text);
  if (cached !== undefined) return cached;
  const result = AD_PATTERNS.some((re) => re.test(text));
  _adCache.set(text, result);
  return result;
}

// ── ICY metadata fetching ────────────────────────────────────────────────────

export async function fetchIcyMeta(
  streamUrl: string,
  signal?: AbortSignal,
): Promise<{ streamTitle: string | null; icyBr: string | null; blacklisted?: boolean }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), STATION_META_FETCH_TIMEOUT_MS);
  if (signal) {
    if (signal.aborted) {
      clearTimeout(timeout);
      controller.abort();
    } else {
      const onParentAbort = () => controller.abort();
      signal.addEventListener('abort', onParentAbort, _EVT_ONCE);
      controller.signal.addEventListener(
        'abort',
        () => {
          signal.removeEventListener('abort', onParentAbort);
        },
        _EVT_ONCE,
      );
    }
  }
  try {
    const res = await fetch(`/api/icy-meta?url=${encodeURIComponent(streamUrl)}`, {
      signal: controller.signal,
    });
    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      if (data?.blacklisted) return { streamTitle: null, icyBr: null, blacklisted: true };
      return { streamTitle: null, icyBr: null };
    }
    if (!res.ok) return { streamTitle: null, icyBr: null };
    const data = await res.json();
    return { streamTitle: data.streamTitle ?? null, icyBr: data.icyBr ?? null };
  } catch {
    return { streamTitle: null, icyBr: null };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Track parsing ────────────────────────────────────────────────────────────

let _lastStation = '';
let _lastStationLower = '';
const _TRACK_SEPARATORS = [' - ', ' — ', ' – ', ' | '];

export function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
  if (!raw || raw.length > MAX_TITLE_LENGTH) return null;
  if (raw === stationName) return null;
  if (stationName !== _lastStation) {
    _lastStation = stationName;
    _lastStationLower = stationName.toLowerCase();
  }
  if (raw.toLowerCase() === _lastStationLower) return null;
  for (const sep of _TRACK_SEPARATORS) {
    const idx = raw.indexOf(sep);
    if (idx > 0)
      return { artist: raw.slice(0, idx).trim(), title: raw.slice(idx + sep.length).trim() };
  }
  return { title: raw.trim(), artist: '' };
}

// ── URL / device helpers ─────────────────────────────────────────────────────

/** Route a stream URL through our CORS proxy so Web Audio API can access it */
export function proxyUrl(raw: string): string {
  return `/api/proxy-stream?url=${encodeURIComponent(raw)}`;
}

export function isValidStreamUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Browser blocked autoplay — treat as paused, not error */
export function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError';
}

export function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return _IOS_UA_RE.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}
