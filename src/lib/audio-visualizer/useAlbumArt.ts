/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { normalizeText } from '@/lib/stringUtils';

const FETCH_TIMEOUT = 8_000;

interface AlbumInfo {
  artworkUrl: string | null;
  albumName: string | null;
  releaseDate: string | null;
  itunesUrl: string | null;
  durationMs: number | null;
  genre: string | null;
  trackNumber: number | null;
  trackCount: number | null;
}

const CACHE = new Map<string, AlbumInfo>();
const MAX_CACHE = 200;
const EMPTY_ALBUM_INFO: AlbumInfo = {
  artworkUrl: null, albumName: null, releaseDate: null, itunesUrl: null,
  durationMs: null, genre: null, trackNumber: null, trackCount: null,
};

type ItunesResult = {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  collectionName?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  trackNumber?: number;
  trackCount?: number;
};

// Reusable match arrays for Jaro distance — avoids allocation per call
let _aMatches: boolean[] = [];
let _bMatches: boolean[] = [];

function jaroDistance(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const matchDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;

  // Grow and reset reusable arrays
  if (_aMatches.length < a.length) _aMatches = new Array(a.length);
  if (_bMatches.length < b.length) _bMatches = new Array(b.length);
  for (let i = 0; i < a.length; i++) _aMatches[i] = false;
  for (let i = 0; i < b.length; i++) _bMatches[i] = false;

  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j++) {
      if (_bMatches[j] || a[i] !== b[j]) continue;
      _aMatches[i] = true;
      _bMatches[j] = true;
      matches++;
      break;
    }
  }

  if (!matches) return 0;

  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!_aMatches[i]) continue;
    while (k < b.length && !_bMatches[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }

  const transpositions = t / 2;
  return (
    matches / a.length +
    matches / b.length +
    (matches - transpositions) / matches
  ) / 3;
}

function jaroWinkler(a: string, b: string): number {
  const jaro = jaroDistance(a, b);
  if (jaro < 0.7) return jaro;
  let prefix = 0;
  const maxPrefix = 4;
  for (let i = 0; i < Math.min(maxPrefix, a.length, b.length); i++) { if (a[i] === b[i]) prefix++; else break; }
  return jaro + prefix * 0.1 * (1 - jaro);
}

function selectBestItunesResult(results: ItunesResult[], requestedTitle: string, requestedArtist: string | null): ItunesResult | null {
  if (!results.length) return null;

  const normalizedRequestedTitle = normalizeText(requestedTitle);
  const normalizedRequestedArtist = normalizeText(requestedArtist);
  if (!normalizedRequestedTitle) return null;

  // Pre-normalize all candidates once to avoid redundant normalizeText calls in loop
  const normTitles = new Array<string>(results.length);
  const normArtists = new Array<string>(results.length);
  for (let i = 0; i < results.length; i++) {
    normTitles[i] = normalizeText(results[i].trackName);
    normArtists[i] = normalizeText(results[i].artistName);
  }

  const exactIdx = normTitles.indexOf(normalizedRequestedTitle);
  if (exactIdx !== -1) {
    if (!normalizedRequestedArtist) return results[exactIdx];
    const exactArtist = normArtists[exactIdx];
    if (!exactArtist || exactArtist === normalizedRequestedArtist || exactArtist.includes(normalizedRequestedArtist) || normalizedRequestedArtist.includes(exactArtist)) {
      return results[exactIdx];
    }
  }

  let best: ItunesResult | null = null;
  let bestScore = 0;

  for (let i = 0; i < results.length; i++) {
    const candidateTitle = normTitles[i];
    if (!candidateTitle) continue;

    const lenDiff = Math.abs(candidateTitle.length - normalizedRequestedTitle.length);
    const maxLen = Math.max(candidateTitle.length, normalizedRequestedTitle.length);
    if (maxLen > 0 && lenDiff / maxLen > 0.35) continue;

    const titleScore = jaroDistance(candidateTitle, normalizedRequestedTitle);
    if (titleScore < 0.94) continue;

    let score = titleScore;
    if (normalizedRequestedArtist) {
      const candidateArtist = normArtists[i];
      if (candidateArtist) {
        const artistScore = jaroWinkler(candidateArtist, normalizedRequestedArtist);
        if (artistScore < 0.85) continue;
        score = (titleScore * 0.85) + (artistScore * 0.15);
      }
    }

    if (score > bestScore) { bestScore = score; best = results[i]; }
  }

  return best ?? null;
}

function cacheGet(key: string): AlbumInfo | undefined {
  const val = CACHE.get(key);
  if (val !== undefined) {
    // Move to end for LRU ordering
    CACHE.delete(key);
    CACHE.set(key, val);
  }
  return val;
}

function cacheSet(key: string, value: AlbumInfo) {
  CACHE.delete(key);
  CACHE.set(key, value);
  while (CACHE.size > MAX_CACHE) {
    const oldest = CACHE.keys().next().value;
    if (oldest !== undefined) CACHE.delete(oldest);
    else break;
  }
}

const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';

function appendReferrer(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${ITUNES_REFERRER}`;
}

/** Preload an image so it's already in the browser cache when rendered. */
function preloadImage(url: string) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => { img.src = ''; }; // release failed load
  img.src = url;
}

export interface UseAlbumArtReturn {
  artworkUrl: string | null;
  albumName: string | null;
  releaseDate: string | null;
  itunesUrl: string | null;
  durationMs: number | null;
  genre: string | null;
  trackNumber: number | null;
  trackCount: number | null;
  isLoading: boolean;
}

export function useAlbumArt(title: string | null, artist: string | null): UseAlbumArtReturn {
  const hasTitle = Boolean(title);
  const cacheKey = useMemo(() => (title ? `${artist ?? ''}\n${title}`.toLowerCase() : ''), [title, artist]);
  const cachedInfo = useMemo(() => {
    if (!cacheKey) return null;
    return cacheGet(cacheKey) ?? null;
  }, [cacheKey]);
  const [fetched, setFetched] = useState<{ key: string; info: AlbumInfo } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!title || !cacheKey || cachedInfo) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    // Use server-side proxy to avoid CORS/CSP issues from the browser
    const term = artist ? `${artist} ${title}` : title;
    fetch(
      `/api/itunes?term=${encodeURIComponent(term)}`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const result = selectBestItunesResult((data.results ?? []) as ItunesResult[], title, artist);
        const artworkUrl = result?.artworkUrl100?.replace('100x100', '600x600') ?? null;
        const rawItunesUrl: string | null = result?.trackViewUrl ?? result?.collectionViewUrl ?? null;
        const albumInfo: AlbumInfo = {
          artworkUrl,
          albumName: result?.collectionName ?? null,
          releaseDate: result?.releaseDate ?? null,
          itunesUrl: rawItunesUrl ? appendReferrer(rawItunesUrl) : null,
          durationMs: typeof result?.trackTimeMillis === 'number' ? result.trackTimeMillis : null,
          genre: result?.primaryGenreName ?? null,
          trackNumber: typeof result?.trackNumber === 'number' ? result.trackNumber : null,
          trackCount: typeof result?.trackCount === 'number' ? result.trackCount : null,
        };
        cacheSet(cacheKey, albumInfo);
        if (artworkUrl) preloadImage(artworkUrl);
        setFetched({ key: cacheKey, info: albumInfo });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          cacheSet(cacheKey, EMPTY_ALBUM_INFO);
          setFetched({ key: cacheKey, info: EMPTY_ALBUM_INFO });
        }
      })
      .finally(() => { clearTimeout(timeout); });

    return () => { clearTimeout(timeout); controller.abort(); };
  }, [title, artist, cacheKey, cachedInfo]);

  const info = !cacheKey
    ? EMPTY_ALBUM_INFO
    : cachedInfo ?? (fetched?.key === cacheKey ? fetched.info : EMPTY_ALBUM_INFO);
  const isLoading = Boolean(hasTitle && cacheKey && !cachedInfo && fetched?.key !== cacheKey);

  return useMemo(() => ({ ...info, isLoading }), [
    info.artworkUrl, info.albumName, info.itunesUrl, info.durationMs,
    info.genre, info.releaseDate, info.trackNumber, info.trackCount, isLoading,
  ]);
}
