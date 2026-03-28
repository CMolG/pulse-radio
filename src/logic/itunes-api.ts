/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { normalizeText, cleanFeatFromTitle, primaryArtist } from '@/logic/format-utils';
import { LRU } from '@/logic/audio-context';

export const FETCH_TIMEOUT = 8_000;

export interface AlbumInfo {
  artworkUrl: string | null;
  albumName: string | null;
  releaseDate: string | null;
  itunesUrl: string | null;
  durationMs: number | null;
  genre: string | null;
  trackNumber: number | null;
  trackCount: number | null;
}

export const CACHE = new LRU<AlbumInfo>(200);

export const EMPTY_ALBUM_INFO: AlbumInfo = {
  artworkUrl: null,
  albumName: null,
  releaseDate: null,
  itunesUrl: null,
  durationMs: null,
  genre: null,
  trackNumber: null,
  trackCount: null,
};

export type ItunesResult = {
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  collectionViewUrl?: string;
  collectionName?: string;
  collectionId?: number;
  releaseDate?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
  trackNumber?: number;
  trackCount?: number;
  wrapperType?: string;
};

let _aMatches: boolean[] = [];
let _bMatches: boolean[] = [];

export function jaroDistance(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length,
    lb = b.length;
  if (!la || !lb) return 0;
  const matchDistance = ((la > lb ? la : lb) >> 1) - 1;
  if (_aMatches.length < la) _aMatches = new Array(la);
  if (_bMatches.length < lb) _bMatches = new Array(lb);
  _aMatches.fill(false, 0, la);
  _bMatches.fill(false, 0, lb);
  let matches = 0;
  for (let i = 0; i < la; i++) {
    const start = i - matchDistance;
    const end = i + matchDistance + 1;
    for (let j = start > 0 ? start : 0; j < (end < lb ? end : lb); j++) {
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
  for (let i = 0; i < la; i++) {
    if (!_aMatches[i]) continue;
    while (k < lb && !_bMatches[k]) k++;
    if (k < lb && a[i] !== b[k]) t++;
    k++;
  }
  const transpositions = t / 2;
  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

export function jaroWinkler(a: string, b: string): number {
  const jaro = jaroDistance(a, b);
  if (jaro < 0.7) return jaro;
  let prefix = 0;
  const maxLen =
    4 < a.length ? (4 < b.length ? 4 : b.length) : a.length < b.length ? a.length : b.length;
  for (let i = 0; i < maxLen; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

export function selectBestItunesResult(
  results: ItunesResult[],
  requestedTitle: string,
  requestedArtist: string | null,
): ItunesResult | null {
  if (!results.length) return null;
  const normalizedRequestedTitle = normalizeText(cleanFeatFromTitle(requestedTitle));
  const normalizedRequestedArtist = normalizeText(
    requestedArtist ? primaryArtist(requestedArtist) : '',
  );
  if (!normalizedRequestedTitle) return null;
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
    if (
      !exactArtist ||
      exactArtist === normalizedRequestedArtist ||
      exactArtist.includes(normalizedRequestedArtist) ||
      normalizedRequestedArtist.includes(exactArtist)
    ) {
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
        score = titleScore * 0.85 + artistScore * 0.15;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = results[i];
    }
  }
  return best ?? null;
}

export const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';

export function appendReferrer(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${ITUNES_REFERRER}`;
}

const _preloadedUrls = new Set<string>();

/** Preload an image so it's already in the browser cache when rendered. */
export function preloadImage(url: string) {
  if (_preloadedUrls.has(url)) return;
  _preloadedUrls.add(url);
  if (_preloadedUrls.size > 200) {
    const oldest = _preloadedUrls.values().next().value;
    if (oldest !== undefined) _preloadedUrls.delete(oldest);
  }
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  img.onerror = () => {
    _preloadedUrls.delete(url);
    img.src = '';
  };
  img.src = url;
}
