/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import type React from 'react';

const DIACRITIC_RE = /[\u0300-\u036f]/g;
const NON_ALPHANUM_RE = /[^a-zA-Z0-9\s']/g;
const WHITESPACE_RE = /\s+/g;
const _normalizeCache = new Map<string, string>();
const _NORMALIZE_CACHE_MAX = 512;
export function normalizeText(value: string | null | undefined): string {
  if (!value) return '';
  const cached = _normalizeCache.get(value);
  if (cached !== undefined) return cached;
  const result = value
    .normalize('NFKD')
    .replace(DIACRITIC_RE, '')
    .replace(NON_ALPHANUM_RE, ' ')
    .replace(WHITESPACE_RE, ' ')
    .trim()
    .toLowerCase();
  if (_normalizeCache.size >= _NORMALIZE_CACHE_MAX) {
    const oldest = _normalizeCache.keys().next().value;
    if (oldest !== undefined) _normalizeCache.delete(oldest);
  }
  _normalizeCache.set(value, result);
  return result;
}

const FORMAT_UTILS_ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';
const FORMAT_UTILS_WHITESPACE_RE = /\s+/;
const ARTIST_SPLIT_RE = /[,;&]|feat\.|ft\.|featuring|vs\.?/i;
export function stationInitials(name: string) {
  const words = name.split(FORMAT_UTILS_WHITESPACE_RE);
  let result = '';
  for (let i = 0; i < 2 && i < words.length; i++) {
    const ch = words[i][0];
    if (ch) result += ch.toUpperCase();
  }
  return result;
}
export function primaryArtist(artist: string): string {
  const i = artist.search(ARTIST_SPLIT_RE);
  return (i < 0 ? artist : artist.slice(0, i)).trim();
}
/** Strip feat./ft./featuring suffixes from a track title, e.g. "Title (feat. X)" → "Title" */
const _FEAT_PARENS_RE = /\s*[\(\[](feat|ft|featuring)\.?\s+[^\)\]]*[\)\]]/gi;
const _FEAT_BARE_RE = /\s+(feat|ft|featuring)\.?\s+.*/i;
export function cleanFeatFromTitle(title: string): string {
  return title.replace(_FEAT_PARENS_RE, '').replace(_FEAT_BARE_RE, '').trim();
}
function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
export function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
export function itunesSearchUrl(title: string, artist: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://music.apple.com/search?term=${q}&${FORMAT_UTILS_ITUNES_REFERRER}`;
}
/** Format milliseconds to mm:ss */ export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
/** Format an ISO date string to a readable year */ export function formatReleaseDate(
  isoDate: string,
): string {
  return isoDate.slice(0, 4);
}

export function buildStationShareUrl(station: { name: string; stationuuid: string }): string {
  if (typeof window === 'undefined') return '';
  const slug = slugify(station.name);
  const base = window.location.origin + window.location.pathname;
  return `${base}?tune=${slug}&sid=${station.stationuuid}`;
}

export function _tagsDisplay(tags: string | undefined): string {
  if (!tags) return 'Internet RadioIcon';
  let result = '';
  let count = 0;
  let start = 0;
  for (let i = 0; i <= tags.length; i++) {
    if (i === tags.length || tags[i] === ',') {
      if (count > 0) result += ' · ';
      result += tags.slice(start, i);
      if (++count === 3) return result;
      start = i + 1;
    }
  }
  return result || 'Internet RadioIcon';
}

export const _SAFE_AREA_BOTTOM_STYLE: React.CSSProperties = {
  height: 'env(safe-area-inset-bottom, 0px)',
};

export const _NOOP = () => {};
export function _uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const _flagCache = new Map<string, string>();
export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const cached = _flagCache.get(code);
  if (cached) return cached;
  const upper = code.toUpperCase();
  const c0 = upper.charCodeAt(0), c1 = upper.charCodeAt(1);
  if (c0 < 65 || c0 > 90 || c1 < 65 || c1 > 90) return '🌐';
  const flag = String.fromCodePoint(0x1f1e6 + c0 - 65, 0x1f1e6 + c1 - 65);
  _flagCache.set(code, flag);
  return flag;
}
