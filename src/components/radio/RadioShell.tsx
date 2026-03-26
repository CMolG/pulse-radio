import { create } from 'zustand';
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ /* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ ('use client');
type MeterRef = React.RefObject<{ peak: number; rms: number }>;
const ATTACK_MS = 80;
const RELEASE_MS = 350;
const MAX_AMPLITUDE = 0.35;
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
function useAudioReactiveBackground(meterRef: MeterRef, enabled: boolean): { amplitude: number } {
  const [amplitude, setAmplitude] = useState(0);
  const valueRef = useRef(0);
  const lastPublishedRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef(0);
  useEffect(() => {
    const loop = (ts: number) => {
      const lastTs = lastTsRef.current || ts;
      lastTsRef.current = ts;
      const dtSec = Math.max(0.001, (ts - lastTs) / 1000);
      const meter = meterRef.current;
      const rms = enabled && meter ? clamp01(meter.rms) : 0;
      const peak = enabled && meter ? clamp01(meter.peak) : 0;
      const target = Math.min(MAX_AMPLITUDE, rms * 0.85 + peak * 0.15);
      const attack = 1 - Math.exp(-dtSec / (ATTACK_MS / 1000));
      const release = 1 - Math.exp(-dtSec / (RELEASE_MS / 1000));
      const alpha = target > valueRef.current ? attack : release;
      valueRef.current += (target - valueRef.current) * alpha;
      if (Math.abs(valueRef.current - lastPublishedRef.current) >= 0.002) {
        lastPublishedRef.current = valueRef.current;
        setAmplitude(valueRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = 0;
    };
  }, [enabled, meterRef]);
  return { amplitude };
}
/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */ ('use client');
type PlaybackSource = 'radio' | null;
interface PlaybackState {
  source: PlaybackSource;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  muted: boolean;
  trackTitle: string;
  trackArtist: string;
  artworkUrl: string | null;
  setSource: (s: PlaybackSource) => void;
  setPlaying: (p: boolean) => void;
  setCurrentTime: (t: number) => void;
  setVolume: (v: number) => void;
  setMuted: (m: boolean) => void;
  setTrackInfo: (title: string, artist: string, artwork?: string | null) => void;
  reset: () => void;
}
const usePlaybackStore = create<PlaybackState>((set) => ({
  source: null,
  isPlaying: false,
  currentTime: 0,
  volume: 0.8,
  muted: false,
  trackTitle: '',
  trackArtist: '',
  artworkUrl: null,
  setSource: (source) => set({ source }),
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setMuted: (muted) => set({ muted }),
  setTrackInfo: (title, artist, artwork) =>
    set({ trackTitle: title, trackArtist: artist, artworkUrl: artwork ?? null }),
  reset: () =>
    set({
      source: null,
      isPlaying: false,
      currentTime: 0,
      trackTitle: '',
      trackArtist: '',
      artworkUrl: null,
    }),
}));
('use client');
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Minimize2,
  Maximize2,
  Radio as RadioIcon,
  Search,
  Clock,
  Heart,
  Star,
  Settings,
  X,
  Power,
  Plus,
  Save,
  Languages,
  Trash2,
  Music,
  Users,
  ChevronDown,
  Disc3,
  Sliders,
  ChevronUp,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SlidersHorizontal,
  ExternalLink,
  Globe,
  Calendar,
  User,
  Tag,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  Zap,
  MapPin,
  Music2,
  ScanSearch,
} from 'lucide-react';
import type {
  Station,
  ViewState,
  BrowseCategory,
  HistoryEntry,
  FavoriteSong,
  SongDetailData,
  NowPlayingTrack,
  EqBand,
  EqPreset,
  NoiseReductionMode,
  PlaybackStatus,
  ArtistInfo,
  LyricsData,
  LrcLibResponse,
  LyricLine,
} from './constants';
import {
  GENRE_LABEL_KEYS,
  STORAGE_KEYS,
  MAX_RECENT,
  MAX_HISTORY,
  EQ_BANDS,
  EQ_PRESETS,
  GENRE_GRADIENTS,
  GENRE_CATEGORIES,
  countryFlag,
} from './constants';
import { useLocale } from '@/context/LocaleContext';
import { COUNTRY_BY_CODE, isSovereignCountryCode, SOVEREIGN_COUNTRIES } from '@/lib/i18n/countries';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';
import {
  IoRadioOutline,
  IoMusicalNotesOutline,
  IoHeartOutline,
  IoStatsChartOutline,
  IoColorPaletteOutline,
  IoPhonePortraitOutline,
  IoShareOutline,
  IoCheckmarkCircleOutline,
  IoHelpCircleOutline,
  IoPersonOutline,
  IoDiscOutline,
  IoTimeOutline,
  IoSearchOutline,
  IoTimerOutline,
  IoGlobeOutline,
  IoChevronBack,
} from 'react-icons/io5';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/radio/components/ErrorBoundary';
import { useMediaQuery } from 'usehooks-ts';
import { LANG3_TO_LOCALE, LOCALE_SELF_CANDIDATES } from '@/lib/i18n/locales';
import type { SupportedLocale } from '@/lib/i18n/locales';
/** Sync state from cross-tab StorageEvents for a given key. */ function useStorageSync<T>(
  key: string,
  setter: (val: T) => void,
  validate: (v: unknown) => boolean = Array.isArray,
): void {
  const setterRef = useRef(setter);
  const validateRef = useRef(validate);
  setterRef.current = setter;
  validateRef.current = validate;
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (validateRef.current(parsed)) setterRef.current(parsed as T);
      } catch {
        /* ignore malformed */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);
}
const DIACRITIC_RE = /[\u0300-\u036f]/g;
const NON_ALPHANUM_RE = /[^a-zA-Z0-9\s']/g;
const WHITESPACE_RE = /\s+/g;
const _normalizeCache = new Map<string, string>();
const _NORMALIZE_CACHE_MAX = 512;
function normalizeText(value: string | null | undefined): string {
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
class LRU<T> {
  private m = new Map<string, T>();
  constructor(private max: number) {}
  get(k: string) {
    const v = this.m.get(k);
    if (v !== undefined) {
      this.m.delete(k);
      this.m.set(k, v);
    }
    return v;
  }
  set(k: string, v: T) {
    this.m.delete(k);
    this.m.set(k, v);
    while (this.m.size > this.max) {
      const oldest = this.m.keys().next().value;
      if (oldest !== undefined) this.m.delete(oldest);
      else break;
    }
  }
}
const audioSourceCache = new WeakMap<
  HTMLAudioElement,
  { ctx: AudioContext; source: MediaElementAudioSourceNode }
>();
let sharedCtx: AudioContext | null = null;
function getSharedContext(): AudioContext {
  if (!sharedCtx || sharedCtx.state === 'closed') sharedCtx = new AudioContext();
  if (sharedCtx.state === 'suspended') sharedCtx.resume().catch(_NOOP);
  return sharedCtx;
}
function getOrCreateAudioSource(audio: HTMLAudioElement): {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
} {
  const existing = audioSourceCache.get(audio);
  if (existing) {
    if (existing.ctx.state === 'suspended') existing.ctx.resume().catch(_NOOP);
    return existing;
  }
  const ctx = getSharedContext();
  const source = ctx.createMediaElementSource(audio);
  const entry = { ctx, source };
  audioSourceCache.set(audio, entry);
  return entry;
}
function resumeAudioContext(audio: HTMLAudioElement): void {
  const entry = audioSourceCache.get(audio);
  if (entry && entry.ctx.state === 'suspended') entry.ctx.resume().catch(_NOOP);
}
function hasAudioSource(audio: HTMLAudioElement): boolean {
  return audioSourceCache.has(audio);
}
const FORMAT_UTILS_ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';
const FORMAT_UTILS_WHITESPACE_RE = /\s+/;
const ARTIST_SPLIT_RE = /[,;&]|feat\.|ft\.|featuring|vs\.?/i;
function stationInitials(name: string) {
  const words = name.split(FORMAT_UTILS_WHITESPACE_RE);
  let result = '';
  for (let i = 0; i < 2 && i < words.length; i++) {
    const ch = words[i][0];
    if (ch) result += ch.toUpperCase();
  }
  return result;
}
function primaryArtist(artist: string): string {
  const i = artist.search(ARTIST_SPLIT_RE);
  return (i < 0 ? artist : artist.slice(0, i)).trim();
}
/** Strip feat./ft./featuring suffixes from a track title, e.g. "Title (feat. X)" → "Title" */
const _FEAT_PARENS_RE = /\s*[\(\[](feat|ft|featuring)\.?\s+[^\)\]]*[\)\]]/gi;
const _FEAT_BARE_RE = /\s+(feat|ft|featuring)\.?\s+.*/i;
function cleanFeatFromTitle(title: string): string {
  return title.replace(_FEAT_PARENS_RE, '').replace(_FEAT_BARE_RE, '').trim();
}
function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
function itunesSearchUrl(title: string, artist: string): string {
  const q = encodeURIComponent(`${artist} ${title}`.trim());
  return `https://music.apple.com/search?term=${q}&${FORMAT_UTILS_ITUNES_REFERRER}`;
}
/** Format milliseconds to mm:ss */ function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0:00';
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}
/** Format an ISO date string to a readable year */ function formatReleaseDate(
  isoDate: string,
): string {
  return isoDate.slice(0, 4);
}
type UiImageProps = {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  onError?: () => void;
  style?: React.CSSProperties;
};
function UiImage({
  src,
  alt,
  className,
  sizes = '100vw',
  priority,
  loading,
  onError,
  style,
}: UiImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      sizes={sizes}
      className={className}
      priority={priority}
      loading={loading}
      onError={onError}
      style={style}
    />
  );
}
type CountryChip = {
  code: string;
  queryName: string;
  displayName: string;
  flag: string;
  reason: 'language' | 'proximity' | 'global';
};
const GLOBAL_INTEREST_CODES = ['US', 'GB', 'DE', 'FR', 'ES', 'BR', 'JP', 'KR', 'IN', 'CA', 'AU'];
const EXCLUDED_LOW_RELEVANCE_CODES = new Set([
  'AD',
  'SM',
  'LI',
  'MC',
  'VA',
  'KI',
  'TV',
  'NR',
  'PW',
  'MH',
  'FM',
  'TO',
  'WS',
  'VU',
]);
const REGION_PRIORITY: Record<string, number> = {
  Europe: 1,
  Asia: 2,
  Americas: 3,
  Africa: 4,
  Oceania: 5,
  Antarctic: 6,
  Other: 9,
};
function localeCandidates(locale: SupportedLocale): SupportedLocale[] {
  return LOCALE_SELF_CANDIDATES[locale] ?? [locale];
}
function localeFromLang3(code3: string): SupportedLocale | null {
  return LANG3_TO_LOCALE[code3] ?? null;
}
const _displayNamesCache = new Map<string, Intl.DisplayNames>();
function getCountryDisplayName(locale: SupportedLocale, code: string): string {
  const country = COUNTRY_BY_CODE[code];
  if (!country) return code;
  try {
    let dn = _displayNamesCache.get(locale);
    if (!dn) {
      dn = new Intl.DisplayNames([locale], { type: 'region' });
      _displayNamesCache.set(locale, dn);
    }
    return dn.of(code) ?? country.name;
  } catch {
    return country.name;
  }
}
function getSameLanguageCountries(locale: SupportedLocale): string[] {
  const candidates = new Set(localeCandidates(locale));
  const result: string[] = [];
  for (const country of SOVEREIGN_COUNTRIES) {
    for (const lang3 of country.lang3) {
      const mapped = localeFromLang3(lang3);
      if (mapped && candidates.has(mapped)) { result.push(country.code); break; }
    }
  }
  return result;
}
function _tagsDisplay(tags: string | undefined): string {
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
function getProximityCountries(seedCodes: string[]): string[] {

  if (seedCodes.length === 0) return [];
  const seed: (typeof SOVEREIGN_COUNTRIES)[number][] = [];
  for (let i = 0; i < seedCodes.length; i++) {
    const c = COUNTRY_BY_CODE[seedCodes[i]];
    if (c) seed.push(c);
  }
  const regions = new Set<string>();
  const subregions = new Set<string>();
  const borders = new Set<string>();
  for (const country of seed) {
    if (country.region) regions.add(country.region);
    if (country.subregion) subregions.add(country.subregion);
    for (const b of country.borders) borders.add(b);
  }
  return SOVEREIGN_COUNTRIES.map((country) => {
    let score = 0;
    if (borders.has(country.code)) score += 100;
    if (subregions.has(country.subregion)) score += 60;
    if (regions.has(country.region)) score += 30;
    score += 30;
    score -= (REGION_PRIORITY[country.region] ?? REGION_PRIORITY.Other) * 0.05;
    return { code: country.code, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.code);
}
function uniquePush(target: string[], seen: Set<string>, values: string[]) {
  for (const value of values) {
    if (!seen.has(value)) { seen.add(value); target.push(value); }
  }
}
function getCountryChipsForLocale(locale: SupportedLocale, maxChips = 36): CountryChip[] {
  const languageCodes = getSameLanguageCountries(locale);
  const proximityCodes = getProximityCountries(languageCodes);
  const ordered: string[] = [];
  const seen = new Set<string>();
  uniquePush(ordered, seen, languageCodes);
  uniquePush(ordered, seen, proximityCodes);
  uniquePush(ordered, seen, GLOBAL_INTEREST_CODES);
  const capped = ordered
    .filter((code) => COUNTRY_BY_CODE[code] && !EXCLUDED_LOW_RELEVANCE_CODES.has(code))
    .slice(0, maxChips);
  const languageSet = new Set(languageCodes);
  const proximitySet = new Set(proximityCodes);
  return capped.map((code) => {
    const country = COUNTRY_BY_CODE[code]!;
    const displayName = getCountryDisplayName(locale, code);
    const reason: CountryChip['reason'] = languageSet.has(code)
      ? 'language'
      : proximitySet.has(code)
        ? 'proximity'
        : 'global';
    return { code, queryName: country.name, displayName, flag: countryFlag(code), reason };
  });
}
type PaintFn = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  freqData: Uint8Array | null,
) => void;
/** Returns true on touch-capable devices (mobile/tablet). Used to throttle canvas FPS. */
const _isTouchDevice =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
/** Shared RAF-driven canvas loop with DPR-aware sizing.
 *  Pauses when document is hidden; throttles to ~30fps on touch devices. */
function useCanvasLoop(
  frequencyDataRef: React.RefObject<Uint8Array | null> | undefined,
  paint: PaintFn,
  dprScale = 1,
): React.RefObject<HTMLCanvasElement | null> {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const paintRef = useRef(paint);
  const freqRef = useRef(frequencyDataRef);
  const sizeRef = useRef({ w: 0, h: 0 });
  const lastPaintRef = useRef(0);
  // ~30fps on mobile (33ms), uncapped on desktop
  const minFrameMs = _isTouchDevice ? 33 : 0;
  useEffect(() => {
    paintRef.current = paint;
  });
  useEffect(() => {
    freqRef.current = frequencyDataRef;
  }, [frequencyDataRef]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * dprScale;
      sizeRef.current = { w: Math.round(rect.width * dpr), h: Math.round(rect.height * dpr) };
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [dprScale]);
  useEffect(() => {
    const loop = (now: number) => {
      frameRef.current = requestAnimationFrame(loop);
      // Pause rendering when tab/PWA is hidden
      if (document.hidden) return;
      // Throttle to target FPS on mobile
      if (minFrameMs > 0 && now - lastPaintRef.current < minFrameMs) return;
      lastPaintRef.current = now;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const { w, h } = sizeRef.current;
      if (w < 1 || h < 1) return;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      paintRef.current(ctx, w, h, freqRef.current?.current ?? null);
    };
    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [dprScale, minFrameMs]);
  return canvasRef;
}
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
const CACHE = new LRU<AlbumInfo>(200);
const EMPTY_ALBUM_INFO: AlbumInfo = {
  artworkUrl: null,
  albumName: null,
  releaseDate: null,
  itunesUrl: null,
  durationMs: null,
  genre: null,
  trackNumber: null,
  trackCount: null,
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
let _aMatches: boolean[] = [];
let _bMatches: boolean[] = [];
function jaroDistance(a: string, b: string): number {
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
function jaroWinkler(a: string, b: string): number {
  const jaro = jaroDistance(a, b);
  if (jaro < 0.7) return jaro;
  let prefix = 0;
  const maxLen = 4 < a.length ? (4 < b.length ? 4 : b.length) : a.length < b.length ? a.length : b.length;
  for (let i = 0; i < maxLen; i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}
function selectBestItunesResult(
  results: ItunesResult[],
  requestedTitle: string,
  requestedArtist: string | null,
): ItunesResult | null {
  if (!results.length) return null;
  const normalizedRequestedTitle = normalizeText(cleanFeatFromTitle(requestedTitle));
  const normalizedRequestedArtist = normalizeText(requestedArtist ? primaryArtist(requestedArtist) : '');
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
const ITUNES_REFERRER = 'pt=pulse-radio&ct=www.pulse-radio.online';
function appendReferrer(url: string): string {
  if (!url) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}${ITUNES_REFERRER}`;
}
const _preloadedUrls = new Set<string>();
/** Preload an image so it's already in the browser cache when rendered. */ function preloadImage(
  url: string,
) {
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
function useAlbumArt(title: string | null, artist: string | null) {
  const hasTitle = Boolean(title);
  const cacheKey = useMemo(
    () => (title ? `${artist ?? ''}\n${title}`.toLowerCase() : ''),
    [title, artist],
  );
  const cachedInfo = useMemo(() => {
    if (!cacheKey) return null;
    return CACHE.get(cacheKey) ?? null;
  }, [cacheKey]);
  const [fetched, setFetched] = useState<{ key: string; info: AlbumInfo } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!title || !cacheKey || cachedInfo) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
    const cleanArtist = artist ? primaryArtist(artist) : '';
    const cleanTitle = cleanFeatFromTitle(title);
    const term = cleanArtist ? `${cleanArtist} ${cleanTitle}` : cleanTitle;
    fetch(`/api/itunes?term=${encodeURIComponent(term)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const result = selectBestItunesResult(
          (data.results ?? []) as ItunesResult[],
          title,
          artist,
        );
        const artworkUrl = result?.artworkUrl100?.replace('100x100', '600x600') ?? null;
        const rawItunesUrl: string | null =
          result?.trackViewUrl ?? result?.collectionViewUrl ?? null;
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
        CACHE.set(cacheKey, albumInfo);
        if (artworkUrl) preloadImage(artworkUrl);
        setFetched({ key: cacheKey, info: albumInfo });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          CACHE.set(cacheKey, EMPTY_ALBUM_INFO);
          setFetched({ key: cacheKey, info: EMPTY_ALBUM_INFO });
        }
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [title, artist, cacheKey, cachedInfo]);
  const info = !cacheKey
    ? EMPTY_ALBUM_INFO
    : (cachedInfo ?? (fetched?.key === cacheKey ? fetched.info : EMPTY_ALBUM_INFO));
  const isLoading = Boolean(hasTitle && cacheKey && !cachedInfo && fetched?.key !== cacheKey);
  return useMemo(
    () => ({ ...info, isLoading }),
    [
      info.artworkUrl,
      info.albumName,
      info.itunesUrl,
      info.durationMs,
      info.genre,
      info.releaseDate,
      info.trackNumber,
      info.trackCount,
      isLoading,
    ],
  );
}
// ---------------------------------------------------------------------------
// useConcerts — fetch upcoming concerts for the current artist via Bandsintown
// ---------------------------------------------------------------------------
interface ConcertEvent {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  lineup: string[];
  ticketUrl: string | null;
}
const _concertsCache = new LRU<ConcertEvent[]>(64);
function useConcerts(artist: string | null | undefined, enabled: boolean) {
  const [concerts, setConcerts] = useState<ConcertEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const key = artist ? primaryArtist(artist).toLowerCase().trim() : null;
  useEffect(() => {
    if (!enabled || !key) { setConcerts([]); return; }
    const cached = _concertsCache.get(key);
    if (cached) { setConcerts(cached); return; }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/concerts?artist=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data: ConcertEvent[]) => {
        const list = Array.isArray(data) ? data : [];
        _concertsCache.set(key, list);
        setConcerts(list);
      })
      .catch(() => { /* silently ignore */ })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [key, enabled]);
  return { concerts, loading };
}
const SERVERS = [
  'https://de1.api.radio-browser.info/json',
  'https://de2.api.radio-browser.info/json',
  'https://nl1.api.radio-browser.info/json',
];
let serverIndex = 0;
function getBase(): string {
  return SERVERS[serverIndex % SERVERS.length];
}
function rotateServer(): void {
  serverIndex = (serverIndex + 1) % SERVERS.length;
}
const radioApiCache = new Map<string, { data: Station[]; ts: number }>();
const TTL = 60_000;
const RADIO_API_MAX_CACHE = 100;
async function fetchCached(path: string, key: string): Promise<Station[]> {
  const hit = radioApiCache.get(key);
  if (hit && Date.now() - hit.ts < TTL) {
    radioApiCache.delete(key);
    radioApiCache.set(key, hit);
    return hit.data;
  }
  for (let attempt = 0; attempt < SERVERS.length; attempt++) {
    try {
      const url = `${getBase()}${path}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        await res.text().catch(_NOOP);
        rotateServer();
        continue;
      }
      const data: Station[] = await res.json();
      const filtered = data.filter((s) => s.url_resolved);
      radioApiCache.set(key, { data: filtered, ts: Date.now() });
      while (radioApiCache.size > RADIO_API_MAX_CACHE) {
        const oldest = radioApiCache.keys().next().value;
        if (oldest !== undefined) radioApiCache.delete(oldest);
        else break;
      }
      return filtered;
    } catch {
      rotateServer();
    }
  }
  throw new Error('All Radio-Browser API servers unavailable');
}
async function topStations(limit = 20): Promise<Station[]> {
  return fetchCached(`/stations/topvote?limit=${limit}`, `top-${limit}`);
}
function searchBy(
  filter: Record<string, string>,
  cacheKey: string,
  limit: number,
): Promise<Station[]> {
  const params = new URLSearchParams({
    ...filter,
    limit: `${limit}`,
    order: 'votes',
    reverse: 'true',
  });
  return fetchCached(`/stations/search?${params}`, cacheKey);
}
function searchStations(query: string, limit = 30): Promise<Station[]> {
  return searchBy({ name: query }, `search:${query}`, limit);
}
function stationsByTag(tag: string, limit = 30): Promise<Station[]> {
  return searchBy({ tag: tag.toLowerCase() }, `tag:${tag}`, limit);
}
function stationsByCountry(country: string, limit = 30): Promise<Station[]> {
  return searchBy({ country }, `country:${country}`, limit);
}
function trendingStations(limit = 20): Promise<Station[]> {
  return topStations(limit);
}
async function localStations(limit = 20): Promise<Station[]> {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  const di = lang ? lang.indexOf('-') : -1;
  const countryCode = di > 0 ? lang.slice(di + 1).toUpperCase() : '';
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) return topStations(limit);
  return fetchCached(
    `/stations/bycountrycodeexact/${encodeURIComponent(countryCode)}?limit=${limit}&order=votes&reverse=true`,
    `local-${countryCode}-${limit}`,
  );
}
async function similarStations(station: Station, limit = 5): Promise<Station[]> {
  let firstTag: string | undefined;
  if (station.tags) {
    for (const raw of station.tags.split(',')) {
      const trimmed = raw.trim();
      if (trimmed) { firstTag = trimmed; break; }
    }
  }
  if (!firstTag) return topStations(limit);
  const results = await stationsByTag(firstTag, limit + 5);
  return results
    .filter((s) => s.stationuuid !== station.stationuuid && s.url_resolved)
    .slice(0, limit);
}
const STATS_STORAGE_KEY = 'radio-usage-stats';
const SAVE_INTERVAL_MS = 10_000;
const MAX_STATIONS = 300;
const MAX_SONGS = 500;
const MAX_ARTISTS = 200;
const MAX_GENRES = 100;
type StationListenTime = { name: string; uuid: string; totalMs: number };
type SongPlayCount = {
  title: string;
  artist: string;
  count: number;
  artworkUrl?: string;
  genre?: string;
};
type ArtistPlayCount = { name: string; count: number };
type GenrePlayCount = { genre: string; count: number };
interface UsageStats {
  stationListenTimes: Record<string, StationListenTime>;
  songPlayCounts: Record<string, SongPlayCount>;
  artistPlayCounts: Record<string, ArtistPlayCount>;
  genrePlayCounts: Record<string, GenrePlayCount>;
  totalListenMs: number;
}
const EMPTY_STATS: UsageStats = {
  stationListenTimes: {},
  songPlayCounts: {},
  artistPlayCounts: {},
  genrePlayCounts: {},
  totalListenMs: 0,
};
/** Keep only the top N entries by a numeric field, dropping the lowest */ function pruneTop<T>(
  map: Record<string, T>,
  max: number,
  key: keyof T,
): Record<string, T> {
  const entries = Object.entries(map);
  if (entries.length <= max) return map;
  return Object.fromEntries(
    entries.sort((a, b) => (b[1][key] as number) - (a[1][key] as number)).slice(0, max),
  );
}
/** Return top N values from a record, sorted descending by a numeric field */ function topN<T>(
  map: Record<string, T>,
  key: keyof T,
  n: number,
): T[] {
  return Object.values(map)
    .sort((a, b) => (b[key] as number) - (a[key] as number))
    .slice(0, n);
}
function useStats() {
  const [stats, setStats] = useState<UsageStats>(() =>
    loadFromStorage<UsageStats>(STATS_STORAGE_KEY, EMPTY_STATS),
  );
  const statsRef = useRef(stats);
  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);
  useStorageSync<UsageStats>(
    STATS_STORAGE_KEY,
    setStats,
    (v): v is UsageStats => !!v && typeof (v as UsageStats).totalListenMs === 'number',
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const persist = useCallback(() => {
    if (dirtyRef.current) {
      const current = statsRef.current;
      const pStations = pruneTop(current.stationListenTimes, MAX_STATIONS, 'totalMs');
      const pSongs = pruneTop(current.songPlayCounts, MAX_SONGS, 'count');
      const pArtists = pruneTop(current.artistPlayCounts, MAX_ARTISTS, 'count');
      const pGenres = pruneTop(current.genrePlayCounts, MAX_GENRES, 'count');
      const didPrune =
        pStations !== current.stationListenTimes ||
        pSongs !== current.songPlayCounts ||
        pArtists !== current.artistPlayCounts ||
        pGenres !== current.genrePlayCounts;
      if (didPrune) {
        const pruned: UsageStats = {
          ...current,
          stationListenTimes: pStations,
          songPlayCounts: pSongs,
          artistPlayCounts: pArtists,
          genrePlayCounts: pGenres,
        };
        setStats(pruned);
        saveToStorage(STATS_STORAGE_KEY, pruned);
      } else saveToStorage(STATS_STORAGE_KEY, current);
      dirtyRef.current = false;
    }
  }, []);
  useEffect(() => {
    saveTimerRef.current = setInterval(persist, SAVE_INTERVAL_MS);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
      persist();
    };
  }, [persist]);
  const tickListenTime = useCallback(
    (stationUuid: string, stationName: string, deltaMs: number) => {
      if (deltaMs <= 0 || !stationUuid) return;
      setStats((prev) => {
        const entry = prev.stationListenTimes[stationUuid] ?? {
          name: stationName,
          uuid: stationUuid,
          totalMs: 0,
        };
        return {
          ...prev,
          stationListenTimes: {
            ...prev.stationListenTimes,
            [stationUuid]: { ...entry, name: stationName, totalMs: entry.totalMs + deltaMs },
          },
          totalListenMs: prev.totalListenMs + deltaMs,
        };
      });
      dirtyRef.current = true;
    },
    [],
  );
  const recordSongPlay = useCallback(
    (title: string, artist: string, genre?: string, artworkUrl?: string) => {
      if (!title) return;
      const songKey = `${title}|||${artist}`;
      const primary = primaryArtist(artist);
      setStats((prev) => {
        const songEntry = prev.songPlayCounts[songKey] ?? { title, artist, count: 0 };
        const artistEntry = prev.artistPlayCounts[primary] ?? { name: primary, count: 0 };
        const normalizedGenre = genre ? genre.toLowerCase().trim() : undefined;
        const next: UsageStats = {
          ...prev,
          songPlayCounts: {
            ...prev.songPlayCounts,
            [songKey]: {
              ...songEntry,
              count: songEntry.count + 1,
              artworkUrl: artworkUrl ?? songEntry.artworkUrl,
              genre: normalizedGenre ?? songEntry.genre,
            },
          },
          artistPlayCounts: {
            ...prev.artistPlayCounts,
            [primary]: { ...artistEntry, count: artistEntry.count + 1 },
          },
        };
        if (normalizedGenre) {
          const genreEntry = prev.genrePlayCounts[normalizedGenre] ?? {
            genre: normalizedGenre,
            count: 0,
          };
          next.genrePlayCounts = {
            ...prev.genrePlayCounts,
            [normalizedGenre]: { ...genreEntry, count: genreEntry.count + 1 },
          };
        }
        return next;
      });
      dirtyRef.current = true;
    },
    [],
  );
  const topStations = useMemo(
    () => topN(stats.stationListenTimes, 'totalMs', 10),
    [stats.stationListenTimes],
  );
  const topSongs = useMemo(() => topN(stats.songPlayCounts, 'count', 10), [stats.songPlayCounts]);
  const topArtists = useMemo(
    () => topN(stats.artistPlayCounts, 'count', 10),
    [stats.artistPlayCounts],
  );
  const sortedGenres = useMemo(
    () => Object.values(stats.genrePlayCounts).sort((a, b) => b.count - a.count),
    [stats.genrePlayCounts],
  );
  const topGenres = useMemo(() => sortedGenres.slice(0, 10), [sortedGenres]);
  const genreOrder = useMemo(() => sortedGenres.map((g) => g.genre), [sortedGenres]);
  const updateSongMeta = useCallback(
    (title: string, artist: string, genre?: string, artworkUrl?: string) => {
      if (!title) return;
      const key = `${title}|||${artist}`;
      setStats((prev) => {
        const songEntry = prev.songPlayCounts[key];
        if (!songEntry) return prev;
        const needsArtwork = artworkUrl && songEntry.artworkUrl !== artworkUrl;
        const normalizedGenre = genre ? genre.toLowerCase().trim() : '';
        const needsGenre = normalizedGenre && songEntry.genre !== normalizedGenre;
        if (!needsArtwork && !needsGenre) return prev;
        const next: UsageStats = {
          ...prev,
          songPlayCounts: {
            ...prev.songPlayCounts,
            [key]: {
              ...songEntry,
              ...(needsArtwork ? { artworkUrl } : {}),
              ...(needsGenre ? { genre: normalizedGenre } : {}),
            },
          },
        };
        if (needsGenre) {
          const genreEntry = prev.genrePlayCounts[normalizedGenre] ?? {
            genre: normalizedGenre,
            count: 0,
          };
          next.genrePlayCounts = {
            ...prev.genrePlayCounts,
            [normalizedGenre]: { ...genreEntry, count: genreEntry.count + 1 },
          };
        }
        return next;
      });
      dirtyRef.current = true;
    },
    [],
  );
  const clearStats = useCallback(() => {
    setStats(EMPTY_STATS);
    saveToStorage(STATS_STORAGE_KEY, EMPTY_STATS);
  }, []);
  return {
    stats,
    tickListenTime,
    recordSongPlay,
    updateSongMeta,
    topStations,
    topSongs,
    topArtists,
    topGenres,
    genreOrder,
    clearStats,
  };
}
const CODEC_MAP: Record<string, string> = {
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
const STATION_META_FETCH_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 10_000;
const MAX_TITLE_LENGTH = 500;
const _adCache = new LRU<boolean>(256);
function isAdContent(text: string): boolean {
  const cached = _adCache.get(text);
  if (cached !== undefined) return cached;
  const result = AD_PATTERNS.some((re) => re.test(text));
  _adCache.set(text, result);
  return result;
}
async function fetchIcyMeta(
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
let _lastStation = '';
let _lastStationLower = '';
const _TRACK_SEPARATORS = [' - ', ' — ', ' – ', ' | '];
function parseTrack(raw: string, stationName: string): NowPlayingTrack | null {
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
function useStationMeta(station: Station | null, isPlaying: boolean) {
  const [track, setTrack] = useState<NowPlayingTrack | null>(null);
  const [icyBitrate, setIcyBitrate] = useState<string | null>(null);
  const [streamCodec, setStreamCodec] = useState<string | null>(null);
  const [stationBlacklisted, setStationBlacklisted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTitleRef = useRef<string>('');
  const prevStationUrlRef = useRef<string | null>(null);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!station) {
      lastTitleRef.current = '';
      prevStationUrlRef.current = null;
      setStationBlacklisted(false);
      return;
    }
    const stationChanged = station.url_resolved !== prevStationUrlRef.current;
    if (stationChanged) {
      prevStationUrlRef.current = station.url_resolved;
      lastTitleRef.current = '';
    }
    const abortController = new AbortController();
    const poll = async () => {
      if (abortController.signal.aborted || document.hidden) return;
      const { streamTitle, icyBr, blacklisted } = await fetchIcyMeta(
        station.url_resolved,
        abortController.signal,
      );
      if (abortController.signal.aborted) return;
      if (blacklisted) {
        setStationBlacklisted(true);
        return;
      }
      setStationBlacklisted(false);
      if (icyBr) setIcyBitrate(icyBr);
      if (station.codec) {
        const c = station.codec.toUpperCase();
        setStreamCodec(CODEC_MAP[c] ?? c);
      }
      if (streamTitle && streamTitle !== lastTitleRef.current) {
        lastTitleRef.current = streamTitle;
        const parsed = !isAdContent(streamTitle) ? parseTrack(streamTitle, station.name) : null;
        setTrack(parsed && !isAdContent(parsed.title) ? parsed : null);
        return;
      }
      if (streamTitle) return;
      if (!lastTitleRef.current) setTrack(null);
    };
    if (stationChanged || isPlaying) poll();
    if (isPlaying) intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        poll();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);
        }
      } else if (document.visibilityState === 'hidden') {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      abortController.abort();
    };
  }, [station, isPlaying]);
  return {
    track: station ? track : null,
    icyBitrate: station ? icyBitrate : null,
    streamCodec: station ? streamCodec : null,
    stationBlacklisted,
  };
}
/** Route a stream URL through our CORS proxy so Web Audio API can access it */ function proxyUrl(
  raw: string,
): string {
  return `/api/proxy-stream?url=${encodeURIComponent(raw)}`;
}
function isValidStreamUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
/** Browser blocked autoplay — treat as paused, not error */ function isAutoplayBlocked(
  err: unknown,
): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError';
}
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    _IOS_UA_RE.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
type StreamQuality = 'good' | 'fair' | 'poor' | 'offline';
type StreamLatency = { url: string; latencyMs: number; timestamp: number };
function useRadio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playSessionRef = useRef(0);
  const proxyFallbackUrlsRef = useRef<Set<string>>(null!);
  const codecFallbackTriedRef = useRef<Set<string>>(null!);
  if (!proxyFallbackUrlsRef.current) proxyFallbackUrlsRef.current = new Set();
  if (!codecFallbackTriedRef.current) codecFallbackTriedRef.current = new Set();
  const isReconnectingRef = useRef(false);
  const srcChangingRef = useRef(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preferDirectStream] = useState(() => isIOSDevice());
  const [station, setStation] = useState<Station | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.VOLUME, 0.8),
  );
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [streamQuality, setStreamQuality] = useState<StreamQuality>('good');
  const lastBufferEndRef = useRef<number>(0);
  const clearTimer = (ref: React.MutableRefObject<any>) => {
    if (ref.current != null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  volumeRef.current = volume;
  mutedRef.current = muted;
  const userPausedRef = useRef(false);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(null!);
  if (!tabIdRef.current) tabIdRef.current = _uid();
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('pulse-radio-playback');
    bcRef.current = bc;
    bc.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'playing' && e.data?.tabId !== tabIdRef.current) {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          userPausedRef.current = true;
          audio.pause();
        }
        clearTimer(fadeTimerRef);
      }
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);
  useEffect(() => {
    return () => {
      clearTimer(fadeTimerRef);
      clearTimer(pauseTimerRef);
      clearTimer(reconnectTimerRef);
      clearTimer(bufferCheckRef);
    };
  }, []);
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.preload = 'none';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);
  const handlePlayRejected = useCallback((err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setStatus(isAutoplayBlocked(err) ? 'paused' : 'error');
  }, []);
  const startPlayback = useCallback(
    (audio: HTMLAudioElement, streamUrl: string, onRejected: (err: unknown) => void) => {
      const webAudioConnected = hasAudioSource(audio);
      const shouldUseProxy =
        !preferDirectStream || proxyFallbackUrlsRef.current.has(streamUrl) || webAudioConnected;
      const setSourceAndPlay = (useProxy: boolean) => {
        srcChangingRef.current = true;
        audio.crossOrigin = useProxy ? 'anonymous' : null;
        audio.src = useProxy ? proxyUrl(streamUrl) : streamUrl;
        Promise.resolve().then(() => {
          srcChangingRef.current = false;
        });
        return audio.play();
      };
      setSourceAndPlay(shouldUseProxy).catch((err) => {
        if (!shouldUseProxy && preferDirectStream && !isAutoplayBlocked(err)) {
          if (proxyFallbackUrlsRef.current.size >= 200) proxyFallbackUrlsRef.current.clear();
          proxyFallbackUrlsRef.current.add(streamUrl);
          setSourceAndPlay(true).catch(onRejected);
          return;
        }
        onRejected(err);
      });
    },
    [preferDirectStream],
  );
  useEffect(() => {
    const audio = getAudio();
    const clearReconnectTimer = () => {
      clearTimer(reconnectTimerRef);
      clearTimer(stallTimerRef);
    };
    const sessionId = playSessionRef.current;
    const reconnect = (delay: number) => {
      if (playSessionRef.current !== sessionId || !station || userPausedRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (isReconnectingRef.current) return;
      if (retryRef.current >= 10) {
        setStatus('error');
        isReconnectingRef.current = false;
        return;
      }
      isReconnectingRef.current = true;
      retryRef.current++;
      setStatus('loading');
      clearReconnectTimer();
      let adaptedDelay = delay;
      const conn =
        typeof navigator !== 'undefined'
          ? (
              navigator as Navigator & {
                connection?: { effectiveType?: string; downlink?: number; saveData?: boolean };
              }
            ).connection
          : undefined;
      if (conn) {
        if (conn.saveData) {
          adaptedDelay = Math.max(delay, 5000);
        } else if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          adaptedDelay = Math.max(delay, 4000);
        } else if (conn.effectiveType === '3g') adaptedDelay = Math.max(delay, 2000);
      }
      const jitter = adaptedDelay * (0.7 + Math.random() * 0.6);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (userPausedRef.current || playSessionRef.current !== sessionId) {
          isReconnectingRef.current = false;
          return;
        }
        startPlayback(audio, station.url_resolved, (err) => {
          isReconnectingRef.current = false;
          handlePlayRejected(err);
        });
      }, jitter);
    };
    const onPause = () => {
      if (userPausedRef.current) {
        setStatus('paused');
        return;
      }
      if (srcChangingRef.current) return;
      if (!station) return;
      setStatus('loading');
      clearTimer(pauseTimerRef);
      pauseTimerRef.current = setTimeout(() => {
        if (userPausedRef.current || !audio.paused) return;
        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            setStatus('paused');
          } else {
            reconnect(500);
          }
        });
      }, 300);
    };
    const onWaiting = () => setStatus('loading');
    const onError = () => {
      const err = audio.error;
      if (
        err &&
        (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
          err.code === MediaError.MEDIA_ERR_DECODE)
      ) {
        if (station && !codecFallbackTriedRef.current.has(station.url_resolved)) {
          if (codecFallbackTriedRef.current.size >= 200) codecFallbackTriedRef.current.clear();
          codecFallbackTriedRef.current.add(station.url_resolved);
          const isCurrentlyProxied = audio.src.startsWith(
            window.location.origin + '/api/proxy-stream',
          );
          const setSourceAndPlay = (useProxy: boolean) => {
            srcChangingRef.current = true;
            audio.crossOrigin = useProxy ? 'anonymous' : null;
            audio.src = useProxy ? proxyUrl(station.url_resolved) : station.url_resolved;
            Promise.resolve().then(() => {
              srcChangingRef.current = false;
            });
            return audio.play();
          };
          setStatus('loading');
          setSourceAndPlay(!isCurrentlyProxied).catch((fallbackErr) => {
            if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') return;
            setStatus('error');
          });
          return;
        }
        setStatus('error');
        return;
      }
      reconnect(1000 * Math.min(retryRef.current + 1, 5));
    };
    let stallCount = 0;
    const onStalled = () => {
      clearTimer(stallTimerRef);
      stallCount++;
      let bufferAhead = 0;
      if (audio.buffered.length > 0)
        bufferAhead = audio.buffered.end(audio.buffered.length - 1) - audio.currentTime;
      const baseTimeout = bufferAhead <= 0 ? 1000 : bufferAhead < 2 ? 2000 : 6000;
      const timeout = Math.max(500, baseTimeout / Math.min(stallCount, 4));
      stallTimerRef.current = setTimeout(() => {
        stallTimerRef.current = null;
        if (audio.paused || audio.readyState < 3) {
          reconnect(1500);
        }
      }, timeout);
    };
    const onPlaying = () => {
      setStatus('playing');
      retryRef.current = 0;
      stallCount = 0;
      userPausedRef.current = false;
      isReconnectingRef.current = false;
      bcRef.current?.postMessage({ type: 'playing', tabId: tabIdRef.current });
    };
    const onEnded = () => {
      if (!userPausedRef.current && station) reconnect(500);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onCanPlay = () => {
      if (!userPausedRef.current && station && audio.paused) audio.play().catch(_NOOP);
    };
    let lastResumeAttempt = 0;
    const RESUME_DEBOUNCE_MS = 1000;
    const onVisibilityResume = () => {
      if (document.visibilityState !== 'visible' || !station || userPausedRef.current) return;
      const now = Date.now();
      if (now - lastResumeAttempt < RESUME_DEBOUNCE_MS) return;
      lastResumeAttempt = now;
      if (audio.paused || audio.readyState < 2) {
        retryRef.current = 0;
        isReconnectingRef.current = false;
        setStatus('loading');
        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            setStatus('paused');
          } else reconnect(500);
        });
      }
    };
    const onOffline = () => {
      clearReconnectTimer();
    };
    const onOnline = () => {
      if (station && !userPausedRef.current && (audio.paused || audio.readyState < 2)) {
        retryRef.current = 0;
        reconnect(500);
      }
    };
    const BUFFER_CHECK_MS = 2000;
    const MIN_BUFFER_AHEAD_S = 2;
    let lowBufferStreak = 0;
    clearTimer(bufferCheckRef);
    const _hasNav = typeof navigator !== 'undefined';
    bufferCheckRef.current = setInterval(() => {
      if (_hasNav && !navigator.onLine) {
        setStreamQuality('offline');
        return;
      }
      const conn = _hasNav
        ? (
            navigator as Navigator & {
              connection?: { effectiveType?: string; saveData?: boolean };
            }
          ).connection
        : undefined;
      if (conn?.saveData) setStreamQuality('fair');
      if (userPausedRef.current || audio.paused || !station) {
        lowBufferStreak = 0;
        return;
      }
      if (document.hidden) return;
      if (isReconnectingRef.current) return;
      const { buffered, currentTime: ct } = audio;
      if (buffered.length === 0) {
        lowBufferStreak++;
        setStreamQuality('poor');
        if (lowBufferStreak >= 2) {
          lowBufferStreak = 0;
          reconnect(300);
        }
        return;
      }
      let ahead = 0;
      let bufferEnd = 0;
      for (let i = 0; i < buffered.length; i++) {
        if (ct >= buffered.start(i) && ct <= buffered.end(i)) {
          ahead = buffered.end(i) - ct;
          bufferEnd = buffered.end(i);
          break;
        }
      }
      const prevEnd = lastBufferEndRef.current;
      const growth = bufferEnd - prevEnd;
      lastBufferEndRef.current = bufferEnd;
      if (ahead >= 5) {
        setStreamQuality(conn?.saveData ? 'fair' : 'good');
      } else if (ahead >= MIN_BUFFER_AHEAD_S) {
        setStreamQuality(growth > 0 ? 'fair' : 'poor');
      } else setStreamQuality('poor');
      if (ahead < MIN_BUFFER_AHEAD_S) {
        lowBufferStreak++;
        if (lowBufferStreak >= 2) {
          lowBufferStreak = 0;
          reconnect(300);
        }
      } else lowBufferStreak = 0;
    }, BUFFER_CHECK_MS);
    const pairs: [EventTarget, string, EventListener][] = [
      [audio, 'playing', onPlaying],
      [audio, 'pause', onPause],
      [audio, 'waiting', onWaiting],
      [audio, 'error', onError],
      [audio, 'stalled', onStalled],
      [audio, 'ended', onEnded],
      [audio, 'timeupdate', onTimeUpdate],
      [audio, 'canplay', onCanPlay],
      [document, 'visibilitychange', onVisibilityResume],
      [window, 'pageshow', onVisibilityResume],
      [window, 'online', onOnline],
      [window, 'offline', onOffline],
    ];
    pairs.forEach(([t, e, h]) => t.addEventListener(e, h));
    return () => {
      clearTimer(stallTimerRef);
      clearTimer(pauseTimerRef);
      clearReconnectTimer();
      clearTimer(bufferCheckRef);
      pairs.forEach(([t, e, h]) => t.removeEventListener(e, h));
    };
  }, [station, getAudio, startPlayback, handlePlayRejected]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VOLUME, volume);
    const audio = audioRef.current;
    if (audio && !fadeTimerRef.current) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);
  const play = useCallback(
    (s: Station) => {
      if (!isValidStreamUrl(s.url_resolved)) {
        setStatus('error');
        return;
      }
      const audio = getAudio();
      resumeAudioContext(audio);
      playSessionRef.current++;
      retryRef.current = 0;
      userPausedRef.current = false;
      isReconnectingRef.current = false;
      proxyFallbackUrlsRef.current.delete(s.url_resolved);
      codecFallbackTriedRef.current.delete(s.url_resolved);
      setStation(s);
      setStatus('loading');
      setStreamQuality('good');
      lastBufferEndRef.current = 0;
      clearTimer(fadeTimerRef);
      if (!audio.paused && audio.src) {
        const steps = 8;
        const interval = 40;
        let step = 0;
        const startVol = audio.volume;
        fadeTimerRef.current = setInterval(() => {
          step++;
          const t = step / steps;
          const eased = 1 - (1 - t) * (1 - t) * (1 - t);
          audio.volume = Math.max(0, startVol * (1 - eased));
          if (step >= steps) {
            clearInterval(fadeTimerRef.current!);
            fadeTimerRef.current = null;
            audio.volume = mutedRef.current ? 0 : volumeRef.current;
            startPlayback(audio, s.url_resolved, handlePlayRejected);
          }
        }, interval);
      } else {
        audio.volume = mutedRef.current ? 0 : volumeRef.current;
        startPlayback(audio, s.url_resolved, handlePlayRejected);
      }
    },
    [getAudio, startPlayback, handlePlayRejected],
  );
  const pause = useCallback(() => {
    userPausedRef.current = true;
    clearTimer(fadeTimerRef);
    audioRef.current?.pause();
  }, []);
  const resume = useCallback(() => {
    userPausedRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      resumeAudioContext(audio);
      audio.volume = mutedRef.current ? 0 : volumeRef.current;
    }
    audio?.play().catch(_NOOP);
  }, []);
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      userPausedRef.current = false;
      resumeAudioContext(audio);
      audio.volume = mutedRef.current ? 0 : volumeRef.current;
      audio.play().catch(_NOOP);
    } else {
      userPausedRef.current = true;
      clearTimer(fadeTimerRef);
      audio.pause();
    }
  }, []);
  const stop = useCallback(() => {
    clearTimer(fadeTimerRef);
    clearTimer(pauseTimerRef);
    clearTimer(reconnectTimerRef);
    clearTimer(bufferCheckRef);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setStation(null);
    setStatus('idle');
    setStreamQuality('good');
    lastBufferEndRef.current = 0;
  }, []);
  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);
  const prefetchedUrlsRef = useRef<Set<string>>(null!);
  if (!prefetchedUrlsRef.current) prefetchedUrlsRef.current = new Set();
  const prefetchStream = useCallback((streamUrl: string) => {
    if (!isValidStreamUrl(streamUrl) || prefetchedUrlsRef.current.has(streamUrl)) return;
    if (prefetchedUrlsRef.current.size >= 500) {
      const evictCount = prefetchedUrlsRef.current.size - 250;
      let i = 0;
      for (const url of prefetchedUrlsRef.current) {
        if (i++ >= evictCount) break;
        prefetchedUrlsRef.current.delete(url);
      }
    }
    prefetchedUrlsRef.current.add(streamUrl);
    const controller = new AbortController();
    fetch(proxyUrl(streamUrl), { method: 'HEAD', signal: controller.signal })
      .then(() => {
        clearTimeout(timer);
      })
      .catch(() => {
        clearTimeout(timer);
      });
    const timer = setTimeout(() => controller.abort(), 2000);
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(t)) return;
    const duration = audio.duration || 0;
    audio.currentTime = Math.max(0, duration ? Math.min(t, duration) : t);
  }, []);
  const ensureAudio = useCallback(() => getAudio(), [getAudio]);
  return {
    station,
    status,
    volume,
    muted,
    currentTime,
    streamQuality,
    audioRef,
    ensureAudio,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    setVolume,
    toggleMute,
    seek,
    prefetchStream,
  };
}
type RealtimeSyncStatus =
  | 'idle'
  | 'unsupported'
  | 'ready'
  | 'listening'
  | 'recovering'
  | 'disabled'
  | 'error';
type RealtimeSyncQualityMode = 'high' | 'balanced' | 'conservative';
type RealtimeSpeechHypothesis = {
  text: string;
  confidence: number;
  isFinal: boolean;
  tsMs: number;
};
type RealtimeSyncDiagnostics = {
  qualityMode: RealtimeSyncQualityMode;
  lastHypothesisMs: number | null;
  hypothesesSeen: number;
  confirmedTransitions: number;
  rejectedJumps: number;
  relockCount: number;
  errorMessage: string | null;
};
type RealtimeSyncState = {
  enabled: boolean;
  supported: boolean;
  status: RealtimeSyncStatus;
  activeLineIndex: number;
  candidateLineIndex: number;
  confidence: number;
  effectiveCurrentTime: number | undefined;
  diagnostics: RealtimeSyncDiagnostics;
};
type RealtimeSyncControls = { toggle: () => void };
type RealtimeSyncResult = RealtimeSyncState & RealtimeSyncControls;
type RealtimeAlignPolicy = {
  candidateMinScore: number;
  confirmMinScore: number;
  minStableSamples: number;
  maxJumpDistance: number;
  relockWindow: number;
};
const DEFAULT_REALTIME_ALIGN_POLICY: RealtimeAlignPolicy = {
  candidateMinScore: 0.74,
  confirmMinScore: 0.84,
  minStableSamples: 2,
  maxJumpDistance: 4,
  relockWindow: 8,
};
function defaultRealtimeDiagnostics(): RealtimeSyncDiagnostics {
  return {
    qualityMode: 'balanced',
    lastHypothesisMs: null,
    hypothesesSeen: 0,
    confirmedTransitions: 0,
    rejectedJumps: 0,
    relockCount: 0,
    errorMessage: null,
  };
}
function defaultRealtimeState(enabled: boolean): RealtimeSyncState {
  return {
    enabled,
    supported: false,
    status: 'idle',
    activeLineIndex: -1,
    candidateLineIndex: -1,
    confidence: 0,
    effectiveCurrentTime: undefined,
    diagnostics: defaultRealtimeDiagnostics(),
  };
}
function isRealtimeEligible(lyrics: LyricsData | null): boolean {
  return Boolean(lyrics?.synced && lyrics.lines.length > 0);
}
type BrowserSpeechAlternative = { transcript: string; confidence?: number };
type BrowserSpeechResult = { 0?: BrowserSpeechAlternative; isFinal: boolean };
type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechResult>;
};
type BrowserSpeechRecognitionErrorEvent = { error: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => BrowserSpeechRecognition;
type EngineCallbacks = {
  onHypothesis: (hypothesis: RealtimeSpeechHypothesis) => void;
  onFatalError: (errorMessage: string) => void;
};
const MAX_RESTARTS = 4;
function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
function isRealtimeSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}
type RealtimeSpeechEngine = {
  start: (lang: 'en' | 'es') => void;
  stop: () => void;
  destroy: () => void;
};
function createRealtimeSpeechEngine(callbacks: EngineCallbacks): RealtimeSpeechEngine {
  let recognition: BrowserSpeechRecognition | null = null;
  let running = false;
  let destroyed = false;
  let restartCount = 0;
  const teardown = () => {
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  };
  const wireRecognition = (lang: 'en' | 'es') => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      callbacks.onFatalError('Speech recognition is not supported in this browser.');
      return;
    }
    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      restartCount = 0;
      const index = event.resultIndex;
      const result = event.results[index];
      if (!result || !result[0]) return;
      const transcript = result[0].transcript.trim().toLowerCase();
      if (!transcript) return;
      callbacks.onHypothesis({
        text: transcript,
        confidence:
          typeof result[0].confidence === 'number' && Number.isFinite(result[0].confidence)
            ? Math.max(0, Math.min(1, result[0].confidence))
            : result.isFinal
              ? 0.7
              : 0.55,
        isFinal: result.isFinal,
        tsMs: performance.now(),
      });
    };
    recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
      if (destroyed || !running) return;
      const fatal =
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'language-not-supported';
      if (fatal) {
        running = false;
        callbacks.onFatalError(`Speech recognition error: ${event.error}`);
        return;
      }
    };
    recognition.onend = () => {
      if (destroyed || !running) return;
      if (restartCount >= MAX_RESTARTS) {
        running = false;
        callbacks.onFatalError('Speech recognition stopped too many times.');
        return;
      }
      restartCount++;
      const current = recognition;
      if (!current) return;
      try {
        current.start();
      } catch {
        running = false;
        callbacks.onFatalError('Speech recognition failed to restart.');
      }
    };
  };
  return {
    start: (lang) => {
      if (destroyed || running) return;
      wireRecognition(lang);
      if (!recognition) return;
      try {
        recognition.start();
        running = true;
        restartCount = 0;
      } catch {
        running = false;
        callbacks.onFatalError('Speech recognition failed to start.');
      }
    },
    stop: () => {
      running = false;
      teardown();
    },
    destroy: () => {
      destroyed = true;
      running = false;
      teardown();
    },
  };
}
type AlignerStepInput = {
  lyrics: LyricsData;
  hypothesisText: string;
  previousConfirmedIndex: number;
  previousCandidateIndex: number;
  stableSamples: number;
  policy: RealtimeAlignPolicy;
};
type AlignerStepResult = {
  candidateIndex: number;
  confirmedIndex: number;
  score: number;
  stableSamples: number;
  jumpRejected: boolean;
  relockTriggered: boolean;
};
const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'el',
  'la',
  'los',
  'las',
  'de',
  'del',
  'y',
  'en',
  'por',
  'con',
  'un',
  'una',
]);
const WORD_RE = /[a-z0-9']+/g;
function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const matches = normalized.match(WORD_RE) ?? [];
  return matches.filter((token) => token.length > 1 && !STOPWORDS.has(token));
}
function scoreLine(lineTokens: string[], hypoTokens: string[], prebuiltLineSet?: Set<string>): number {
  if (!lineTokens.length || !hypoTokens.length) return 0;
  const lineSet = prebuiltLineSet ?? new Set(lineTokens);
  let overlaps = 0;
  for (const token of hypoTokens) {
    if (lineSet.has(token)) overlaps++;
  }
  const overlapScore = overlaps / Math.max(lineSet.size, 1);
  let ordered = 0;
  let lineIdx = 0;
  for (const token of hypoTokens) {
    for (let i = lineIdx; i < lineTokens.length; i++) {
      if (lineTokens[i] === token) {
        ordered++;
        lineIdx = i + 1;
        break;
      }
    }
  }
  const orderScore = ordered / Math.max(hypoTokens.length, 1);
  const shortPenalty = lineTokens.length <= 2 ? 0.2 : 0;
  return Math.max(0, overlapScore * 0.7 + orderScore * 0.3 - shortPenalty);
}
function windowBounds(total: number, center: number, relockWindow: number): [number, number] {
  if (total <= 0) return [0, 0];
  if (center < 0) return [0, Math.min(total - 1, relockWindow)];
  const start = Math.max(0, center - relockWindow);
  const end = Math.min(total - 1, center + relockWindow);
  return [start, end];
}
const _lyricsTokenCache = new WeakMap<LyricsData, string[][]>();
const _lyricsSetCache = new WeakMap<LyricsData, Set<string>[]>();
function getCachedLineTokens(lyrics: LyricsData): string[][] {
  let cached = _lyricsTokenCache.get(lyrics);
  if (!cached) {
    cached = lyrics.lines.map((line) => tokenize(line.text));
    _lyricsTokenCache.set(lyrics, cached);
    _lyricsSetCache.set(
      lyrics,
      cached.map((tokens) => new Set(tokens)),
    );
  }
  return cached;
}
function getCachedLineSets(lyrics: LyricsData): Set<string>[] {
  getCachedLineTokens(lyrics);
  return _lyricsSetCache.get(lyrics)!;
}
function alignHypothesis(input: AlignerStepInput): AlignerStepResult {
  const {
    lyrics,
    hypothesisText,
    previousConfirmedIndex,
    previousCandidateIndex,
    stableSamples,
    policy,
  } = input;
  const hypoTokens = tokenize(hypothesisText);
  if (!hypoTokens.length) {
    return {
      candidateIndex: previousCandidateIndex,
      confirmedIndex: previousConfirmedIndex,
      score: 0,
      stableSamples,
      jumpRejected: false,
      relockTriggered: false,
    };
  }
  const allLineTokens = getCachedLineTokens(lyrics);
  const allLineSets = getCachedLineSets(lyrics);
  const center = previousConfirmedIndex >= 0 ? previousConfirmedIndex : previousCandidateIndex;
  const [start, end] = windowBounds(lyrics.lines.length, center, policy.relockWindow);
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = start; i <= end; i++) {
    const lineTokens = allLineTokens[i] ?? [];
    const lineSet = allLineSets[i];
    const score = scoreLine(lineTokens, hypoTokens, lineSet);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || bestScore < policy.candidateMinScore) {
    return {
      candidateIndex: previousCandidateIndex,
      confirmedIndex: previousConfirmedIndex,
      score: bestScore,
      stableSamples,
      jumpRejected: false,
      relockTriggered: false,
    };
  }
  const sameCandidate = bestIndex === previousCandidateIndex;
  const nextStable = sameCandidate ? stableSamples + 1 : 1;
  const jumpDistance =
    previousConfirmedIndex >= 0 ? Math.abs(bestIndex - previousConfirmedIndex) : 0;
  const jumpRejected = previousConfirmedIndex >= 0 && jumpDistance > policy.maxJumpDistance;
  let confirmed = previousConfirmedIndex;
  let relockTriggered = false;
  if (
    !jumpRejected &&
    bestScore >= policy.confirmMinScore &&
    nextStable >= policy.minStableSamples
  ) {
    confirmed = bestIndex;
  } else if (jumpRejected && bestScore >= Math.min(0.98, policy.confirmMinScore + 0.08)) {
    confirmed = bestIndex;
    relockTriggered = true;
  }
  return {
    candidateIndex: bestIndex,
    confirmedIndex: confirmed,
    score: bestScore,
    stableSamples: nextStable,
    jumpRejected,
    relockTriggered,
  };
}
function mapLineToEffectiveTime(lyrics: LyricsData, lineIndex: number): number | undefined {
  if (!lyrics.synced || !lyrics.lines.length || lineIndex < 0 || lineIndex >= lyrics.lines.length)
    return undefined;
  return lyrics.lines[lineIndex].time;
}
type Params = { lyrics: LyricsData | null; enabled: boolean; languageHint: 'en' | 'es' };
function useRealtimeLyricsSync({ lyrics, enabled, languageHint }: Params): RealtimeSyncResult {
  const initialEnabled = useMemo(
    () => loadFromStorage<boolean>(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, false),
    [],
  );
  const [manuallyEnabled, setManuallyEnabled] = useState<boolean>(initialEnabled);
  const [runtimeState, setRuntimeState] = useState(() => defaultRealtimeState(initialEnabled));
  const engineRef = useRef<RealtimeSpeechEngine | null>(null);
  const stableSamplesRef = useRef(0);
  const eligible = isRealtimeEligible(lyrics);
  const supported = isRealtimeSpeechSupported();
  const realtimeAllowed = enabled && manuallyEnabled;
  const realtimeActive = supported && eligible && realtimeAllowed;
  const [prevResetKey, setPrevResetKey] = useState('');
  const resetKey = `${realtimeActive}::${lyrics?.trackName ?? ''}::${languageHint}::${manuallyEnabled}`;
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setRuntimeState(defaultRealtimeState(manuallyEnabled));
  }
  const toggle = useCallback(() => {
    setManuallyEnabled((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, next);
      return next;
    });
  }, []);
  useEffect(() => {
    if (!realtimeActive) {
      engineRef.current?.stop();
      return;
    }
    engineRef.current?.destroy();
    stableSamplesRef.current = 0;
    const engine = createRealtimeSpeechEngine({
      onHypothesis: (hypothesis) => {
        if (!lyrics || !isRealtimeEligible(lyrics)) return;
        setRuntimeState((prev) => {
          const step = alignHypothesis({
            lyrics,
            hypothesisText: hypothesis.text,
            previousConfirmedIndex: prev.activeLineIndex,
            previousCandidateIndex: prev.candidateLineIndex,
            stableSamples: stableSamplesRef.current,
            policy: DEFAULT_REALTIME_ALIGN_POLICY,
          });
          stableSamplesRef.current = step.stableSamples;
          const effectiveCurrentTime = mapLineToEffectiveTime(lyrics, step.confirmedIndex);
          if (
            prev.status === 'listening' &&
            prev.activeLineIndex === step.confirmedIndex &&
            prev.candidateLineIndex === step.candidateIndex &&
            prev.confidence === step.score &&
            !step.jumpRejected &&
            !step.relockTriggered
          ) {
            return prev;
          }
          return {
            ...prev,
            status: 'listening',
            activeLineIndex: step.confirmedIndex,
            candidateLineIndex: step.candidateIndex,
            confidence: step.score,
            effectiveCurrentTime,
            diagnostics: {
              ...prev.diagnostics,
              lastHypothesisMs: hypothesis.tsMs,
              hypothesesSeen: prev.diagnostics.hypothesesSeen + 1,
              confirmedTransitions:
                prev.diagnostics.confirmedTransitions +
                (step.confirmedIndex !== prev.activeLineIndex ? 1 : 0),
              rejectedJumps: prev.diagnostics.rejectedJumps + (step.jumpRejected ? 1 : 0),
              relockCount: prev.diagnostics.relockCount + (step.relockTriggered ? 1 : 0),
              errorMessage: null,
            },
          };
        });
      },
      onFatalError: (errorMessage) => {
        setRuntimeState((prev) => ({
          ...prev,
          status: 'error',
          activeLineIndex: -1,
          candidateLineIndex: -1,
          confidence: 0,
          effectiveCurrentTime: undefined,
          diagnostics: { ...prev.diagnostics, errorMessage },
        }));
      },
    });
    engineRef.current = engine;
    engine.start(languageHint);
    return () => {
      engine.stop();
    };
  }, [lyrics, languageHint, realtimeActive]);
  useEffect(
    () => () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    },
    [],
  );
  const isSyncing =
    realtimeActive && (runtimeState.status === 'listening' || runtimeState.status === 'recovering');
  return {
    ...runtimeState,
    enabled: manuallyEnabled,
    supported,
    status: !supported
      ? 'unsupported'
      : !realtimeActive
        ? 'idle'
        : runtimeState.status === 'idle'
          ? 'ready'
          : runtimeState.status,
    activeLineIndex: isSyncing ? runtimeState.activeLineIndex : -1,
    candidateLineIndex: isSyncing ? runtimeState.candidateLineIndex : -1,
    confidence: isSyncing ? runtimeState.confidence : 0,
    effectiveCurrentTime: isSyncing ? runtimeState.effectiveCurrentTime : undefined,
    diagnostics: {
      ...runtimeState.diagnostics,
      errorMessage: !supported
        ? 'Realtime lyrics sync is not supported in this browser.'
        : runtimeState.diagnostics.errorMessage,
    },
    toggle,
  };
}
const TS_REGEX = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?]/g;
function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let sorted = true;
  let prevTime = -1;
  for (const raw of lrcText.split('\n')) {
    const timestamps: number[] = [];
    let lastIndex = 0;
    let m;
    TS_REGEX.lastIndex = 0;
    while ((m = TS_REGEX.exec(raw)) !== null) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      if (seconds >= 60) continue;
      let centiseconds = 0;
      if (m[3]) {
        centiseconds = parseInt(m[3], 10);
        if (m[3].length === 1) centiseconds *= 100;
        else if (m[3].length === 2) centiseconds *= 10;
      }
      timestamps.push(minutes * 60 + seconds + centiseconds / 1000);
      lastIndex = TS_REGEX.lastIndex;
    }
    if (timestamps.length === 0) continue;
    const text = raw.slice(lastIndex).trim();
    if (!text) continue;
    for (const time of timestamps) {
      if (time < prevTime) sorted = false;
      prevTime = time;
      lines.push({ time, text });
    }
  }
  return sorted ? lines : lines.sort((a, b) => a.time - b.time);
}
const LRCLIB_BASE = 'https://lrclib.net/api';
const LYRICS_FETCH_TIMEOUT_MS = 8_000;
function isTransientError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof TypeError) return true;
  return false;
}
function fetchWithCancel(url: string, parentSignal?: AbortSignal): Promise<Response> {
  if (!parentSignal) return fetch(url, { signal: AbortSignal.timeout(LYRICS_FETCH_TIMEOUT_MS) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LYRICS_FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  if (parentSignal.aborted) {
    clearTimeout(timeout);
    controller.abort();
    return fetch(url, { signal: controller.signal });
  }
  parentSignal.addEventListener('abort', onParentAbort, _EVT_ONCE);
  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    parentSignal.removeEventListener('abort', onParentAbort);
  });
}
async function fetchLyricsApi(
  artist: string,
  title: string,
  album?: string,
  duration?: number,
  fallbackArtist?: string,
  signal?: AbortSignal,
): Promise<LyricsData | null> {
  const a1 = artist?.trim();
  const a2 = fallbackArtist?.trim();
  const artistCandidates: string[] = [];
  if (a1) {
    artistCandidates.push(a1);
    const primary = primaryArtist(a1);
    if (primary && primary !== a1) artistCandidates.push(primary);
  }
  if (a2 && a2 !== a1) artistCandidates.push(a2);
  if (!artistCandidates.length || !title?.trim()) return null;
  for (const artistCandidate of artistCandidates) {
    if (signal?.aborted) return null;
    try {
      const match = await fetchLyricsForArtist(artistCandidate, title, album, duration, signal);
      if (match) return match;
    } catch (err) {
      if (isTransientError(err)) throw err;
    }
  }
  return null;
}
async function tryFetch<T>(
  url: string,
  signal: AbortSignal | undefined,
  parse: (d: T) => LyricsData | null,
): Promise<LyricsData | null> {
  try {
    const res = await fetchWithCancel(url, signal);
    if (res.ok) return parse(await res.json());
    await res.text().catch(_NOOP);
  } catch (err) {
    if (isTransientError(err)) throw err;
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
  const cleanTitle = cleanFeatFromTitle(title);
  const params = new URLSearchParams({ artist, title: cleanTitle });
  if (album) params.set('album', album);
  if (duration) params.set('duration', `${Math.round(duration)}`);
  return tryFetch<LrcLibResponse>(
    `/api/lyrics?${params}`,
    signal,
    (d) => (d && (d.syncedLyrics || d.plainLyrics) ? transform(d, artist, title) : null),
  );
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
const LYRICS_MAX_CACHE = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
type CacheEntry = { key: string; data: LyricsData; ts: number };
function loadCache(): CacheEntry[] {
  const raw = loadFromStorage<{ key: string; data: LyricsData; ts?: number }[]>(
    STORAGE_KEYS.LYRICS_CACHE,
    [],
  );
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].ts === undefined) (raw[i] as CacheEntry).ts = 0;
  }
  return raw as CacheEntry[];
}
function saveCache(entries: CacheEntry[]) {
  saveToStorage(STORAGE_KEYS.LYRICS_CACHE, entries.slice(0, LYRICS_MAX_CACHE));
}
function useLyrics(
  track: NowPlayingTrack | null,
  stationName?: string | null,
  options?: { currentTime?: number; enableRealtime?: boolean; languageHint?: 'en' | 'es' },
) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RETRIES = 2;
  const enableRealtime = Boolean(options?.enableRealtime && track?.title);
  const doFetch = (key: string, cached: CacheEntry[], controller: AbortController) => {
    if (controller.signal.aborted || !track?.title) return;
    setLoading(true);
    setError(false);
    fetchLyricsApi(
      track.artist || stationName || '',
      track.title,
      track.album,
      undefined,
      stationName ?? undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        retryCountRef.current = 0;
        if (result) {
          setLyrics(result);
          const updated = cached.filter((e) => e.key !== key);
          updated.unshift({ key, data: result, ts: Date.now() });
          saveCache(updated);
        } else setLyrics(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = 1000 * Math.pow(2, retryCountRef.current - 1);
          retryTimerRef.current = setTimeout(() => doFetch(key, cached, controller), delay);
        } else {
          setLyrics(null);
          setError(true);
          retryCountRef.current = 0;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && retryCountRef.current === 0) setLoading(false);
      });
  };
  const lyricsKey = (t: NowPlayingTrack): string => {
    const a = (t.artist || stationName || 'unknown').trim();
    return `${a}\n${t.title}`.toLowerCase();
  };
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    if (!track || !track.title) {
      setLoading(false);
      setLyrics(null);
      setError(false);
      lastKeyRef.current = '';
      return;
    }
    const key = lyricsKey(track);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const cached = loadCache();
    const hit = cached.find((e) => e.key === key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      setLoading(false);
      setLyrics(hit.data);
      setError(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
    return () => {
      controller.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [track?.artist, track?.title, track?.album, stationName]);
  const retry = () => {
    if (!track?.title) return;
    const key = lyricsKey(track);
    const cached = loadCache();
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
  };
  const realtimeSync = useRealtimeLyricsSync({
    lyrics,
    enabled: enableRealtime,
    languageHint: options?.languageHint ?? 'en',
  });
  return {
    lyrics,
    loading,
    error,
    retry,
    effectiveCurrentTime: enableRealtime
      ? (realtimeSync.effectiveCurrentTime ?? options?.currentTime)
      : options?.currentTime,
    realtime: enableRealtime
      ? {
          enabled: realtimeSync.enabled,
          supported: realtimeSync.supported,
          status: realtimeSync.status,
          activeLineIndex: realtimeSync.activeLineIndex,
          candidateLineIndex: realtimeSync.candidateLineIndex,
          confidence: realtimeSync.confidence,
          diagnostics: realtimeSync.diagnostics,
          toggle: realtimeSync.toggle,
        }
      : undefined,
  };
}
type SongCardItem = SongDetailData & { id: string; timestamp: number };
type HeartAction = { filled: boolean; onClick: () => void; label: string };
type SongCardProps = {
  item: SongCardItem;
  delay: number;
  onRemove: () => void;
  onSelect?: (song: SongDetailData) => void;
  heart?: HeartAction | null;
  hideRemove?: boolean;
};
const SongCard = React.memo(
  function SongCard({ item, delay, onRemove, onSelect, heart, hideRemove }: SongCardProps) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(delay * 0.03, 0.5) }}
        className="group bg-surface-2 rounded-xl border border-border-default overflow-hidden hover:bg-surface-3 transition-colors cursor-pointer"
        role="button"
        tabIndex={0}
        aria-label={`${item.title} by ${item.artist}`}
        onClick={() =>
          onSelect?.({
            title: item.title,
            artist: item.artist,
            album: item.album,
            artworkUrl: item.artworkUrl,
            itunesUrl: item.itunesUrl,
            durationMs: item.durationMs,
            genre: item.genre,
            releaseDate: item.releaseDate,
            trackNumber: item.trackNumber,
            trackCount: item.trackCount,
            stationName: item.stationName,
          })
        }
      >
        <div className="w-full aspect-square bg-surface-3 relative">
          {item.artworkUrl ? (
            <UiImage
              src={item.artworkUrl}
              alt=""
              className="object-cover"
              sizes="300px"
              loading="lazy"
            />
          ) : (
            <div className="size-full flex items-center justify-center">
              <Music size={32} className="text-dim" />
            </div>
          )}{' '}
          {heart && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                heart.onClick();
              }}
              aria-label={heart.label}
              className={`absolute top-2 left-2 p-2.5 rounded-full backdrop-blur-sm transition-all ${heart.filled ? 'bg-pink-500/20 text-pink-400' : 'bg-black/50 text-white/40 opacity-0 group-hover:opacity-100 hover:text-pink-400'}`}
            >
              <Heart size={12} className={heart.filled ? 'fill-pink-400' : ''} />
            </button>
          )}{' '}
          {!hideRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label="Remove"
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>{' '}
        <div className="p-3 space-y-0.5">
          <p className="text-[13px] font-medium text-white line-clamp-1">{item.title}</p>{' '}
          <p className="text-[12px] text-secondary line-clamp-1">{item.artist}</p>{' '}
          {item.album && <p className="text-[12px] text-dim line-clamp-1">{item.album}</p>}{' '}
          {(item.genre || item.durationMs) && (
            <p className="text-[12px] text-dim line-clamp-1 flex items-center gap-1">
              {' '}
              {item.genre && <span>{item.genre}</span>}{' '}
              {item.durationMs && (
                <span className="inline-flex items-center gap-0.5">
                  {' '}
                  <Clock size={8} className="opacity-60" />
                  {formatDuration(item.durationMs)}
                </span>
              )}
            </p>
          )}
        </div>{' '}
        <div className="px-3 pb-2.5 space-y-1.5">
          <a
            href={item.itunesUrl || itunesSearchUrl(item.title, item.artist)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 w-full px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-[12px] font-medium text-white/60 hover:text-white/80 transition-colors"
          >
            <ExternalLink size={10} />
            Listen on Apple Music
          </a>
          <div className="flex items-center gap-1.5">
            {' '}
            <RadioIcon size={9} className="text-dim flex-shrink-0" />{' '}
            <p className="text-[12px] text-dim truncate flex-1">{item.stationName}</p>{' '}
            <span className="text-[12px] text-dim">{formatTimeAgo(item.timestamp)}</span>
          </div>
        </div>
      </motion.div>
    );
  },
  (prev, next) =>
    prev.item === next.item &&
    prev.delay === next.delay &&
    prev.hideRemove === next.hideRemove &&
    prev.heart?.filled === next.heart?.filled,
);
const AnimatedBars = React.memo(function AnimatedBars({
  size = 'default',
}: {
  size?: 'small' | 'default';
}) {
  const h = size === 'small' ? 10 : 16;
  const w = size === 'small' ? 2 : 3;
  return (
    <span className="inline-flex items-end" style={{ height: h, gap: size === 'small' ? 1 : 1.5 }}>
      {' '}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="bg-sys-orange rounded-full animate-eq-bar"
          style={{ width: w, height: h * 0.5, animationDelay: `${i * 0.15}s` }}
        />
      ))}{' '}
      <style jsx>{`
        @keyframes eq-bar {
          0%,
          100% {
            height: ${h * 0.2}px;
          }
          50% {
            height: ${h}px;
          }
        }
        .animate-eq-bar {
          animation: eq-bar 0.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-eq-bar {
            animation: none;
            height: ${h * 0.5}px;
          }
        }
      `}</style>{' '}
    </span>
  );
});
type StationCardProps = {
  station: Station;
  isPlaying: boolean;
  isCurrent: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFav: () => void;
  liveStatus?: 'loading' | 'loaded' | 'error';
  liveTrack?: { title: string; artist: string } | null;
  onPeek?: () => void;
  onPrefetch?: () => void;
};
const StationCard = React.memo(
  function StationCard({
    station,
    isPlaying,
    isCurrent,
    isFavorite,
    onPlay,
    onToggleFav,
    liveStatus,
    liveTrack,
    onPeek,
    onPrefetch,
  }: StationCardProps) {
    const [imgError, setImgError] = useState(false);
    const showFallback = !station.favicon || imgError;
    const tags = useMemo(() => {
      const raw = station.tags;
      if (!raw) return [];
      const ci = raw.indexOf(',');
      const first = (ci < 0 ? raw : raw.slice(0, ci)).trim();
      return first ? [first] : [];
    }, [station.tags]);
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`${station.name}${isCurrent && isPlaying ? ' (playing)' : ''}`}
        className={`group cursor-pointer rounded-xl p-2 transition-all duration-150 ${isCurrent ? 'bg-surface-3 ring-1 ring-border-strong' : 'hover:bg-surface-2'}`}
        onClick={onPlay}
        onMouseEnter={onPrefetch}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onPlay();
          }
        }}
      >
        {' '}
        {/* Artwork */}{' '}
        <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 mb-2">
          {' '}
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              {' '}
              <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {stationInitials(station.name) || <RadioIcon size={20} className="text-white/60" />}
              </span>
            </div>
          ) : (
            <UiImage
              src={station.favicon}
              alt=""
              className="object-cover"
              sizes="180px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}{' '}
          {/* Play overlay */}{' '}
          <motion.button
            aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
            initial={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            className={`app-overlay-center bg-black/40 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          >
            {' '}
            <div className="dot-10 bg-sys-orange flex-center-row shadow-lg shadow-black/30">
              {' '}
              {isCurrent && isPlaying ? (
                <Pause size={18} className="text-white" />
              ) : (
                <Play size={18} className="text-white ml-0.5" />
              )}{' '}
            </div>
          </motion.button>{' '}
          {/* Favorite badge */}{' '}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFav();
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={isFavorite}
            className={`absolute top-1.5 right-1.5 p-2 rounded-full transition-all duration-150 ${isFavorite ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50'}`}
          >
            <Heart size={12} className={isFavorite ? 'text-pink-400 fill-pink-400' : 'text-soft'} />
          </button>{' '}
          {/* Now-playing indicator */}{' '}
          {isCurrent && isPlaying && (
            <span className="absolute bottom-1.5 left-1.5 dot-2 bg-sys-orange animate-pulse" />
          )}{' '}
        </div>{' '}
        {/* Name */}{' '}
        <p className="text-[12px] font-medium text-white truncate leading-tight">{station.name}</p>{' '}
        {/* Tags / Country / Format */}{' '}
        <div className="flex-row-1 mt-1 flex-wrap">
          {station.codec && (
            <span className="pad-xs bg-surface-3 text-[12px] font-mono text-secondary uppercase flex-shrink-0">
              {' '}
              {station.codec}
              {station.bitrate > 0 ? ` ${station.bitrate}k` : ''}
            </span>
          )}{' '}
          {tags.map((tag) => (
            <span
              key={tag}
              className="pad-xs-full bg-surface-2 text-[12px] text-secondary truncate max-w-[80px]"
            >
              {tag}
            </span>
          ))}{' '}
          {station.countrycode && (
            <span className="text-[12px] text-dim leading-none">
              {countryFlag(station.countrycode)}
            </span>
          )}
        </div>{' '}
        {/* Live track preview */}{' '}
        {liveStatus === 'loading' && (
          <div className="flex items-center gap-1 mt-1.5">
            {' '}
            <Loader2 size={9} className="text-dim animate-spin flex-shrink-0" />{' '}
            <span className="text-[12px] text-dim">Checking…</span>
          </div>
        )}{' '}
        {liveStatus === 'loaded' && (
          <div className="flex items-center gap-1 mt-1.5 min-w-0">
            {' '}
            {liveTrack ? (
              <>
                <Music2 size={9} className="text-sys-orange flex-shrink-0" />{' '}
                <span className="text-[12px] text-white/60 truncate leading-tight">
                  {' '}
                  {liveTrack.artist ? `${liveTrack.artist} – ${liveTrack.title}` : liveTrack.title}
                </span>
              </>
            ) : (
              <span className="text-[12px] text-white/50">No track info</span>
            )}
          </div>
        )}{' '}
        {onPeek && !liveStatus && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPeek();
            }}
            className="flex items-center gap-1 mt-1.5 text-[12px] text-dim hover:text-white/50 transition-colors"
          >
            {' '}
            <Music2 size={9} /> Check track
          </button>
        )}{' '}
      </div>
    );
  },
  (prev, next) =>
    prev.station === next.station &&
    prev.isPlaying === next.isPlaying &&
    prev.isCurrent === next.isCurrent &&
    prev.isFavorite === next.isFavorite &&
    prev.liveStatus === next.liveStatus &&
    prev.liveTrack === next.liveTrack,
);
/** Order in which category sections appear on the home screen */ const BROWSE_ORDER = [
  'trending',
  'pop',
  'rock',
  'jazz',
  'classical',
  'electronic',
  'hiphop',
  'country',
  'ambient',
  'lofi',
  'news',
  'latin',
  'metal',
  'local',
  'world',
] as const;
const _BROWSE_SET = new Set<string>(BROWSE_ORDER);
const _GENRE_TO_CAT: Record<string, string> = {
  'hip hop': 'hiphop',
  'hip-hop': 'hiphop',
  'lo-fi': 'lofi',
};
const _GENRE_NORMALIZE_RE = /[\s-]/g;
const _IOS_UA_RE = /iPad|iPhone|iPod/;
const _EQ_ALLOWED_KEYS = new Set([' ', 'Escape', 'e', 'E', 'r', 'R', 'ArrowUp', 'ArrowDown', 'm', 'M']);
const _NEWLINE_RE = /\r?\n/;
const _EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();
const _EVT_PASSIVE: AddEventListenerOptions = { passive: true };
const _EVT_ONCE: AddEventListenerOptions = { once: true };
const _EVT_CAPTURE_PASSIVE: AddEventListenerOptions = { capture: true, passive: true };
const _NOOP = () => {};
function _uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}
const _SKELETON_INDICES = [0, 1, 2, 3, 4];
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <Zap size={14} className="text-amber-400/70" />,
  local: <MapPin size={14} className="text-emerald-400/70" />,
};
type BrowseViewProps = {
  view: ViewState;
  currentStation: Station | null;
  isPlaying: boolean;
  isFavorite: (uuid: string) => boolean;
  onPlay: (station: Station) => void;
  onToggleFav: (station: Station) => void;
  onPrefetch?: (streamUrl: string) => void;
  favorites?: Station[];
  recent?: Station[];
  onSelectGenre?: (cat: BrowseCategory) => void;
  onSelectCountry?: (
    countryCode: string,
    countryQueryName: string,
    countryDisplayName: string,
  ) => void;
  onGoHome?: () => void;
  userGenreOrder?: string[];
};
const SCROLL_CLASS =
  'flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]';
function ScrollRow({
  title,
  icon,
  children,
  isMobile,
  className,
}: {
  title?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isMobile: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const check = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    check();
    el.addEventListener('scroll', check, _EVT_PASSIVE);
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', check);
      ro.disconnect();
    };
  }, [check, children]);
  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };
  return (
    <div className={`mb-4 ${className ?? ''}`}>
      {' '}
      {title && (
        <div className={`flex items-center justify-between mb-2 ${isMobile ? 'px-4' : ''}`}>
          {' '}
          <div className="flex-row-1.5">
            {icon} <h3 className="text-[13px] font-semibold text-soft">{title}</h3>
          </div>{' '}
          {!isMobile && (
            <div className="flex gap-1">
              <button
                onClick={() => scroll(-1)}
                className={`p-2 rounded-md transition-colors ${canLeft ? 'text-secondary hover:text-white hover:bg-surface-3' : 'text-white/35 cursor-default'}`}
                disabled={!canLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => scroll(1)}
                className={`p-2 rounded-md transition-colors ${canRight ? 'text-secondary hover:text-white hover:bg-surface-3' : 'text-white/35 cursor-default'}`}
                disabled={!canRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}{' '}
      <div ref={ref} className={SCROLL_CLASS + (isMobile ? ' px-4' : '')}>
        {children}
      </div>
    </div>
  );
}
function BrowseView({
  view,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFav,
  onPrefetch,
  favorites,
  recent,
  onSelectGenre,
  onSelectCountry,
  onGoHome,
  userGenreOrder,
}: BrowseViewProps) {
  const { t, locale } = useLocale();
  const countryChips = useMemo(() => getCountryChipsForLocale(locale), [locale]);
  const translatedGenreCategories = useMemo(
    () =>
      GENRE_CATEGORIES.map((category) => {
        const key = GENRE_LABEL_KEYS[category.id];
        return key ? { ...category, label: t(key) } : category;
      }),
    [t],
  );
  const categoryById = useMemo(() => {
    const m = new Map<string, (typeof translatedGenreCategories)[number]>();
    for (const c of translatedGenreCategories) m.set(c.id, c);
    return m;
  }, [translatedGenreCategories]);
  const effectiveBrowseOrder = useMemo(() => {
    if (!userGenreOrder || userGenreOrder.length === 0) return BROWSE_ORDER;
    const boostedIds = new Set<string>();
    const ordered: string[] = ['trending'];
    boostedIds.add('trending');
    for (const genre of userGenreOrder) {
      const catId = _GENRE_TO_CAT[genre] ?? genre.replace(_GENRE_NORMALIZE_RE, '').toLowerCase();
      if (_BROWSE_SET.has(catId) && !boostedIds.has(catId)) {
        ordered.push(catId);
        boostedIds.add(catId);
      }
    }
    for (const id of BROWSE_ORDER) {
      if (!boostedIds.has(id)) ordered.push(id);
    }
    return ordered;
  }, [userGenreOrder]);
  const isMobile = useMediaQuery('(max-width: 768px)', { initializeWithValue: false });
  const [stations, setStations] = useState<Station[]>([]);
  const [categorySections, setCategorySections] = useState<Record<string, Station[]>>({});
  const [failedCategories, setFailedCategories] = useState<ReadonlySet<string>>(_EMPTY_STRING_SET);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const discoveryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const discoveryFiredRef = useRef(false);
  type LiveInfo = {
    status: 'loading' | 'loaded' | 'error';
    track: { title: string; artist: string } | null;
  };
  const [liveData, setLiveData] = useState<Record<string, LiveInfo>>({});
  const [scanEnabled, setScanEnabled] = useState(false);
  const [songFilter, setSongFilter] = useState('');
  const songFilterTrimmed = useMemo(() => songFilter.trim(), [songFilter]);
  const scanGenRef = useRef(0);
  const [genreChipsExpanded, setGenreChipsExpanded] = useState(false);
  const [countryChipsExpanded, setCountryChipsExpanded] = useState(false);
  const loadCategory = useCallback(
    async (catId: string, flags?: { cancelled: boolean }) => {
      const cat = categoryById.get(catId);
      if (!cat) return;
      try {
        let result: Station[];
        if (cat.id === 'trending') {
          result = await trendingStations(15);
        } else if (cat.id === 'local') {
          result = await localStations(15);
        } else if (cat.tag) {
          result = await stationsByTag(cat.tag, 15);
        } else return;
        if (!flags?.cancelled) {
          setCategorySections((prev) => ({ ...prev, [cat.id]: result }));
          setFailedCategories((prev) => {
            if (!prev.has(catId)) return prev;
            const next = new Set(prev);
            next.delete(catId);
            return next;
          });
        }
      } catch {
        if (!flags?.cancelled) {
          setFailedCategories((prev) => {
            if (prev.has(catId)) return prev;
            const next = new Set(prev);
            next.add(catId);
            return next;
          });
        }
      }
    },
    [categoryById],
  );
  useEffect(() => {
    setPage(0);
    setLiveData({});
    setScanEnabled(false);
    setSongFilter('');
    scanGenRef.current++;
  }, [view]);
  const fetchMeta = useCallback(async (s: Station, stale?: () => boolean) => {
    setLiveData((prev) => ({ ...prev, [s.stationuuid]: { status: 'loading', track: null } }));
    try {
      const result = await fetchIcyMeta(s.url_resolved);
      if (stale?.()) return;
      const raw = result.streamTitle;
      const track = raw ? (parseTrack(raw, s.name) ?? null) : null;
      setLiveData((prev) => ({ ...prev, [s.stationuuid]: { status: 'loaded', track } }));
    } catch {
      if (stale?.()) return;
      setLiveData((prev) => ({ ...prev, [s.stationuuid]: { status: 'error', track: null } }));
    }
  }, []);
  const startScan = useCallback(
    async (stationsToScan: Station[], gen: number) => {
      let idx = 0;
      const stale = () => scanGenRef.current !== gen;
      const worker = async () => {
        while (!stale()) {
          const i = idx++;
          if (i >= stationsToScan.length) break;
          await fetchMeta(stationsToScan[i], stale);
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    },
    [fetchMeta],
  );
  const peekStation = useCallback((station: Station) => fetchMeta(station), [fetchMeta]);
  useEffect(() => {
    let cancelled = false;
    const flags = { cancelled: false };
    setError(null);
    if (view.mode !== 'top') {
      setLoading(true);
      const load = async () => {
        try {
          let result: Station[];
          switch (view.mode) {
            case 'search':
              result = await searchStations(view.query);
              break;
            case 'genre':
              result = await stationsByTag(view.tag);
              break;
            case 'country':
              result = await stationsByCountry(view.countryQueryName);
              break;
            default:
              result = [];
          }
          if (!cancelled) setStations(result);
        } catch {
          if (!cancelled) setError('Failed to load stations');
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
    } else {
      setLoading(false);
      setCategorySections({});
      setFailedCategories(_EMPTY_STRING_SET);
      const CONCURRENCY = 3;
      const queue = [...effectiveBrowseOrder];
      const runBatch = async () => {
        while (queue.length > 0 && !flags.cancelled) {
          const batch = queue.splice(0, CONCURRENCY);
          await Promise.allSettled(batch.map((catId) => loadCategory(catId, flags)));
        }
      };
      runBatch();
    }
    return () => {
      cancelled = true;
      flags.cancelled = true;
    };
  }, [view, retryKey]);
  const allCategoryStations = useMemo(() => {
    const result: Station[] = [];
    for (const arr of Object.values(categorySections)) {
      for (let i = 0; i < arr.length; i++) result.push(arr[i]);
    }
    return result;
  }, [categorySections]);
  const displayCount = view.mode === 'top' ? allCategoryStations.length : stations.length;
  useEffect(() => {
    const pool = view.mode === 'top' ? allCategoryStations : stations;
    if (!discoveryMode) {
      discoveryFiredRef.current = false;
      return;
    }
    if (pool.length > 0) {
      if (!discoveryFiredRef.current) {
        discoveryFiredRef.current = true;
        const random = pool[(Math.random() * pool.length) | 0];
        if (random) onPlay(random);
      }
      discoveryRef.current = setInterval(() => {
        const random = pool[(Math.random() * pool.length) | 0];
        if (random) onPlay(random);
      }, 30_000);
    }
    return () => {
      if (discoveryRef.current) clearInterval(discoveryRef.current);
    };
  }, [discoveryMode, stations, allCategoryStations, view.mode, onPlay]);
  const itemWidth = isMobile ? 'w-[140px]' : 'w-[160px]';
  const renderScrollStations = (list: Station[]) =>
    list.map((s) => (
      <div key={s.stationuuid} className={`snap-start shrink-0 ${itemWidth}`}>
        <StationCard
          station={s}
          isCurrent={s.stationuuid === currentStation?.stationuuid}
          isPlaying={isPlaying && s.stationuuid === currentStation?.stationuuid}
          isFavorite={isFavorite(s.stationuuid)}
          onPlay={() => onPlay(s)}
          onToggleFav={() => onToggleFav(s)}
          onPrefetch={() => onPrefetch?.(s.url_resolved)}
        />
      </div>
    ));
  const pageStations = useMemo(() => {
    return stations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [stations, page, PAGE_SIZE]);
  useEffect(() => {
    if (!scanEnabled || view.mode === 'top' || pageStations.length === 0) return;
    const gen = scanGenRef.current + 1;
    scanGenRef.current = gen;
    startScan(pageStations, gen);
    return () => {
      if (scanGenRef.current === gen) scanGenRef.current++;
    };
  }, [scanEnabled, pageStations, view.mode, startScan]);
  const scannedCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < pageStations.length; i++) {
      if (liveData[pageStations[i].stationuuid]?.status === 'loaded') count++;
    }
    return count;
  }, [pageStations, liveData]);
  const isScanning = useMemo(
    () => scanEnabled && pageStations.some((s) => liveData[s.stationuuid]?.status === 'loading'),
    [scanEnabled, pageStations, liveData],
  );
  const [prevSongFilter, setPrevSongFilter] = useState(songFilter);
  if (songFilter !== prevSongFilter) {
    setPrevSongFilter(songFilter);
    setPage(0);
  }
  const allSongFilteredStations = useMemo(() => {
    if (!songFilterTrimmed) return [];
    const q = songFilterTrimmed.toLowerCase();
    return stations.filter((s) => {
      const live = liveData[s.stationuuid];
      if (!live?.track) return false;
      const { title, artist } = live.track;
      return (
        (title && title.toLowerCase().includes(q)) || (artist && artist.toLowerCase().includes(q))
      );
    });
  }, [stations, songFilterTrimmed, liveData]);
  const songFilteredStations = useMemo(() => {
    if (allSongFilteredStations.length === 0) return pageStations;
    return allSongFilteredStations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [allSongFilteredStations, pageStations, page, PAGE_SIZE]);
  const genreChipActive = (tag: string) => view.mode === 'genre' && view.tag === tag;
  const countryChipActive = (countryCode: string) =>
    view.mode === 'country' && view.countryCode === countryCode;
  return (
    <div className="col-fill min-w-0 h-full">
      {' '}
      {/* Header */}{' '}
      <div className={`${isMobile ? 'px-4' : 'px-5'} pt-4 pb-3 shrink-0 flex-between`}>
        {' '}
        <div>
          <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>
            {view.label}
          </h2>{' '}
          <p className="text-[12px] text-muted mt-0.5">
            {' '}
            {loading ? t('loadingStations') : t('stationCount', { count: displayCount })}
          </p>
        </div>
        <button
          onClick={() => setDiscoveryMode((d) => !d)}
          className={`flex-row-1.5 px-3 py-2 rounded-full text-[11px] font-medium transition-colors ${discoveryMode ? 'bg-sys-purple/20 text-sys-purple border border-sys-purple/30' : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr'}`}
          title={t('discoveryModeTitle')}
          aria-pressed={discoveryMode}
          aria-label={t('discoveryModeAria')}
        >
          <Sparkles size={12} /> {t('discovery')}
          {discoveryMode ? ` ${t('discoveryOn')}` : ''}
        </button>
      </div>{' '}
      {/* Genre chips — wrapping, limited on mobile */}{' '}
      {(() => {
        const MOBILE_LIMIT = 7;
        const collapsed = isMobile && !genreChipsExpanded;
        const visibleGenres = collapsed
          ? translatedGenreCategories.slice(0, MOBILE_LIMIT)
          : translatedGenreCategories;
        return (
          <div className={`shrink-0 flex flex-wrap gap-1.5 ${isMobile ? 'px-3' : 'px-4'} pb-2`}>
            <button
              onClick={() => onGoHome?.()}
              className={`px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== 'genre' ? 'bg-surface-6 text-white' : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70'}`}
            >
              {t('all')}
            </button>{' '}
            {visibleGenres.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectGenre?.(cat)}
                aria-current={genreChipActive(cat.tag ?? cat.id) || undefined}
                className={`px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${genreChipActive(cat.tag ?? cat.id) ? `bg-linear-to-r ${cat.gradient} text-white` : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70'}`}
              >
                {cat.label}
              </button>
            ))}{' '}
            {collapsed && translatedGenreCategories.length > MOBILE_LIMIT && (
              <button
                onClick={() => setGenreChipsExpanded(true)}
                className="px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap text-white/50 bg-white/[0.06] hover:bg-white/10 transition-colors"
              >
                {t('seeMore')}
              </button>
            )}
          </div>
        );
      })()}{' '}
      {/* Country chips — wrapping, limited on mobile */}{' '}
      {(() => {
        const MOBILE_LIMIT = 7;
        const collapsed = isMobile && !countryChipsExpanded;
        const visibleCountries = collapsed ? countryChips.slice(0, MOBILE_LIMIT) : countryChips;
        return (
          <div className={`shrink-0 flex flex-wrap gap-1.5 ${isMobile ? 'px-3' : 'px-4'} pb-3`}>
            <button
              onClick={() => onGoHome?.()}
              className={`px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== 'country' ? 'bg-surface-6 text-white' : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70'}`}
            >{`🌐 ${t('allCountries')}`}</button>{' '}
            {visibleCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => onSelectCountry?.(c.code, c.queryName, c.displayName)}
                aria-current={countryChipActive(c.code) || undefined}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${countryChipActive(c.code) ? 'bg-surface-6 text-white' : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70'}`}
              >
                <span>{c.flag}</span>
                <span>{c.displayName}</span>
              </button>
            ))}{' '}
            {collapsed && countryChips.length > MOBILE_LIMIT && (
              <button
                onClick={() => setCountryChipsExpanded(true)}
                className="px-3 py-2 rounded-full text-[11px] font-medium whitespace-nowrap text-white/50 bg-white/[0.06] hover:bg-white/10 transition-colors"
              >
                {t('seeMore')}
              </button>
            )}
          </div>
        );
      })()}{' '}
      {/* Content */}{' '}
      <div className={`app-body ${isMobile ? 'px-0' : 'px-4'} pb-4 overflow-y-auto`}>
        {loading && (
          <div className="flex-center-row py-16">
            <Loader2 size={24} className="text-dim animate-spin" />
          </div>
        )}{' '}
        {error && (
          <div className="flex-center-col gap-3 py-16">
            <RadioIcon size={32} className="text-muted" />{' '}
            <p className="text-[13px] text-secondary">{t('failedToLoad')}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-1.5 rounded-lg bg-surface-3 text-[12px] font-medium text-secondary hover:text-white hover:bg-surface-4 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}{' '}
        {!loading && !error && view.mode !== 'top' && stations.length === 0 && (
          <div className="flex-center-col py-16">
            <RadioIcon size={32} className="text-muted mb-2" />{' '}
            <p className="text-[13px] text-secondary">{t('noStationsFound')}</p>
          </div>
        )}{' '}
        {!loading && !error && (
          <>
            {' '}
            {/* Category rows for top view */}{' '}
            {view.mode === 'top' && (
              <>
                {' '}
                {/* Favorites row */}{' '}
                {favorites && favorites.length > 0 && (
                  <ScrollRow
                    title={t('favorites')}
                    icon={<Star size={14} className="text-sys-orange/70" />}
                    isMobile={isMobile}
                  >
                    {renderScrollStations(favorites)}
                  </ScrollRow>
                )}{' '}
                {/* Recent stations row */}{' '}
                {recent && recent.length > 0 && (
                  <ScrollRow
                    title={t('recent')}
                    icon={<Clock size={14} className="text-blue-400/70" />}
                    isMobile={isMobile}
                  >
                    {renderScrollStations(recent)}
                  </ScrollRow>
                )}{' '}
                {effectiveBrowseOrder.map((catId) => {
                  const cat = categoryById.get(catId);
                  if (!cat) return null;
                  const catStations = categorySections[catId];
                  if (catStations?.length === 0) return null;
                  const icon =
                    CATEGORY_ICONS[catId] ??
                    (catStations ? (
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full bg-linear-to-r ${cat.gradient}`}
                      />
                    ) : (
                      <Music size={14} className="text-dim" />
                    ));
                  return (
                    <ScrollRow key={catId} title={cat.label} icon={icon} isMobile={isMobile}>
                      {' '}
                      {!catStations && failedCategories.has(catId) ? (
                        <div
                          className={`snap-start shrink-0 ${itemWidth} h-45 rounded-xl bg-surface-2 flex-center-col gap-2`}
                        >
                          {' '}
                          <RadioIcon size={18} className="text-muted" />{' '}
                          <p className="text-[12px] text-muted">{t('failedToLoadStations')}</p>
                          <button
                            onClick={() => loadCategory(catId)}
                            className="px-3 py-1 rounded-lg bg-surface-4 text-[11px] text-secondary hover:text-white hover:bg-surface-5 transition-colors"
                          >
                            {t('retry')}
                          </button>
                        </div>
                      ) : !catStations ? (
                        _SKELETON_INDICES.map((i) => (
                          <div
                            key={i}
                            className={`snap-start shrink-0 ${itemWidth} h-45 rounded-xl bg-surface-2 animate-pulse`}
                          />
                        ))
                      ) : (
                        renderScrollStations(catStations)
                      )}
                    </ScrollRow>
                  );
                })}
              </>
            )}{' '}
            {/* Grid column for search / genre / country views — paginated */}{' '}
            {view.mode !== 'top' &&
              stations.length > 0 &&
              (() => {
                const filterActive = !!songFilterTrimmed;
                const paginationSource = filterActive ? allSongFilteredStations : stations;
                const totalPages = Math.ceil(paginationSource.length / PAGE_SIZE);
                return (
                  <>
                    {' '}
                    {/* Scan now-playing bar */}{' '}
                    <div className={`flex items-center gap-2 mb-3 ${isMobile ? 'px-3' : 'px-0'}`}>
                      <button
                        onClick={() => setScanEnabled((v) => !v)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-medium transition-colors shrink-0 ${scanEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/30' : 'bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr'}`}
                        title={t('scanNowPlaying')}
                      >
                        <ScanSearch size={12} />{' '}
                        {isScanning
                          ? t('scanningProgress', {
                              current: scannedCount,
                              total: pageStations.length,
                            })
                          : scannedCount > 0
                            ? t('nowPlayingProgress', {
                                current: scannedCount,
                                total: pageStations.length,
                              })
                            : t('scanNowPlaying')}
                      </button>{' '}
                      {scanEnabled && (
                        <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-2 border border-white/5 min-w-0">
                          {' '}
                          <Music2 size={11} className="text-dim shrink-0" />{' '}
                          <input
                            type="text"
                            placeholder={t('filterBySong')}
                            value={songFilter}
                            onChange={(e) => setSongFilter(e.target.value)}
                            className="bg-transparent text-white placeholder:text-white/50 outline-none w-full min-w-0"
                          />{' '}
                          {songFilter && (
                            <button
                              onClick={() => setSongFilter('')}
                              className="text-dim hover:text-white shrink-0"
                              aria-label="Clear filter"
                            >
                              {' '}
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      )}{' '}
                      {scanEnabled && songFilter && (
                        <span className="text-[11px] text-dim shrink-0">
                          {' '}
                          {t('stationCount', { count: allSongFilteredStations.length })}
                        </span>
                      )}
                    </div>{' '}
                    {/* Station grid */}{' '}
                    <div
                      className={`grid gap-3 ${isMobile ? 'grid-cols-2 px-3' : 'grid-cols-4 px-0'} pb-4`}
                    >
                      {' '}
                      {(songFilterTrimmed ? songFilteredStations : pageStations).map((s) => {
                        const live = liveData[s.stationuuid];
                        return (
                          <StationCard
                            key={s.stationuuid}
                            station={s}
                            isPlaying={isPlaying && currentStation?.stationuuid === s.stationuuid}
                            isCurrent={currentStation?.stationuuid === s.stationuuid}
                            isFavorite={isFavorite(s.stationuuid)}
                            onPlay={() => onPlay(s)}
                            onToggleFav={() => onToggleFav(s)}
                            onPrefetch={() => onPrefetch?.(s.url_resolved)}
                            liveStatus={live?.status}
                            liveTrack={live?.track}
                            onPeek={!scanEnabled ? () => peekStation(s) : undefined}
                          />
                        );
                      })}
                    </div>{' '}
                    {/* Pagination */}{' '}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-center gap-3 pt-2 pb-6">
                        <button
                          onClick={() => setPage((p) => Math.max(0, p - 1))}
                          disabled={page === 0}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === 0 ? 'text-white/35 cursor-default' : 'bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white'}`}
                        >
                          <ChevronLeft size={14} /> {t('previous')}
                        </button>
                        <span className="text-[12px] text-dim tabular-nums">
                          {' '}
                          {t('pageFraction', { current: page + 1, total: totalPages })}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page === totalPages - 1}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === totalPages - 1 ? 'text-white/35 cursor-default' : 'bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white'}`}
                        >
                          {t('next')} <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
          </>
        )}
      </div>
    </div>
  );
}
type RenderableLyricLine = { id: string; text: string };
function getActiveLyricIndex(lyrics: LyricsData | null, currentTime?: number) {
  if (currentTime == null || !lyrics?.synced || !lyrics.lines.length) return -1;
  const lines = lyrics.lines;
  let lo = 0;
  let hi = lines.length - 1;
  let result = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (lines[mid].time <= currentTime) {
      result = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return result;
}
function getEffectiveActiveLyricIndex(
  lyrics: LyricsData | null,
  currentTime: number | undefined,
  activeLineOverride?: number,
) {
  if (typeof activeLineOverride === 'number' && activeLineOverride >= 0) {
    if (!lyrics?.synced || !lyrics.lines.length) return -1;
    return Math.min(activeLineOverride, lyrics.lines.length - 1);
  }
  return getActiveLyricIndex(lyrics, currentTime);
}
function getRenderableLyricLines(lyrics: LyricsData | null): RenderableLyricLine[] {
  if (!lyrics) return [];
  if (lyrics.synced && lyrics.lines.length > 0) {
    return lyrics.lines.map((line, index) => ({
      id: `synced-${index}-${line.time}`,
      text: line.text || '♪',
    }));
  }
  if (!lyrics.plainText) return [];
  const raw = lyrics.plainText.split(_NEWLINE_RE);
  const result: RenderableLyricLine[] = [];
  for (let i = 0; i < raw.length; i++) {
    const text = raw[i].trim();
    if (text) result.push({ id: `plain-${result.length}`, text });
  }
  return result;
}
type LyricsReelProps = {
  lyrics: LyricsData | null;
  currentTime?: number;
  activeLineOverride?: number;
  variant?: 'mobile' | 'desktop';
};
const EMPHASIS: [string, string, string][] = [
  ['text-white font-bold opacity-100 scale-100', 'text-[22px]', 'text-[28px]'],
  ['text-white/82 font-semibold opacity-100 scale-[0.985]', 'text-[18px]', 'text-[23px]'],
  ['text-white/50 font-medium opacity-100 scale-95', 'text-[15px]', 'text-[19px]'],
  ['text-white/35 font-medium opacity-100 scale-[0.92]', 'text-[13px]', 'text-[17px]'],
  ['text-white/30 font-medium opacity-100 scale-[0.88]', 'text-[12px]', 'text-[16px]'],
];
const LyricReelLine = React.memo(
  function LyricReelLine({
    lineId,
    index,
    text,
    emphasisIdx,
    isDesktop,
    lineRefs,
    scrollToIndex,
  }: {
    lineId: string;
    index: number;
    text: string;
    emphasisIdx: number;
    isDesktop: boolean;
    lineRefs: React.MutableRefObject<(HTMLElement | null)[]>;
    scrollToIndex: (i: number) => void;
  }) {
    const emphasisClass = `${EMPHASIS[emphasisIdx][0]} ${EMPHASIS[emphasisIdx][isDesktop ? 2 : 1]}`;
    return (
      <button
        key={lineId}
        ref={(node) => {
          lineRefs.current[index] = node;
        }}
        type="button"
        onClick={() => scrollToIndex(index)}
        className={`block w-full snap-center px-2 py-2 text-center leading-snug tracking-tight transition-all duration-300 ${emphasisClass}`}
      >
        <span
          className={`mx-auto block whitespace-pre-wrap ${isDesktop ? 'max-w-3xl' : 'max-w-[92%]'}`}
        >
          {text}
        </span>{' '}
      </button>
    );
  },
  (prev, next) =>
    prev.lineId === next.lineId &&
    prev.text === next.text &&
    prev.emphasisIdx === next.emphasisIdx &&
    prev.isDesktop === next.isDesktop,
);
const _LYRICS_MASK_STYLE: React.CSSProperties = {
  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
  maskImage: 'linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)',
};
function LyricsReel({
  lyrics,
  currentTime,
  activeLineOverride,
  variant = 'mobile',
}: LyricsReelProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const isDesktop = variant === 'desktop';
  const renderableLines = useMemo(() => getRenderableLyricLines(lyrics), [lyrics]);
  const activeIdx = useMemo(
    () => getEffectiveActiveLyricIndex(lyrics, currentTime, activeLineOverride),
    [activeLineOverride, currentTime, lyrics],
  );
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current;
    const line = lineRefs.current[index];
    if (!scroller || !line) return;
    const top = line.offsetTop - scroller.clientHeight / 2 + line.clientHeight / 2;
    scroller.scrollTo({ top: Math.max(0, top), behavior });
  }, []);
  const updateFocusedIdx = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !renderableLines.length) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const centerY = scrollerRect.top + scrollerRect.height / 2;
    let closestIdx = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    lineRefs.current.forEach((line, index) => {
      if (!line) return;
      const rect = line.getBoundingClientRect();
      const lineCenter = rect.top + rect.height / 2;
      const distance = Math.abs(centerY - lineCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIdx = index;
      }
    });
    setFocusedIdx((prev) => (prev === closestIdx ? prev : closestIdx));
  }, [renderableLines.length]);
  useEffect(() => {
    lineRefs.current.length = renderableLines.length;
  }, [renderableLines.length]);
  useEffect(() => {
    if (!renderableLines.length) return;
    const frame = requestAnimationFrame(() => {
      scrollToIndex(0, 'auto');
      setFocusedIdx(0);
    });
    return () => cancelAnimationFrame(frame);
  }, [renderableLines.length]);
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !renderableLines.length) return;
    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateFocusedIdx);
    };
    frame = requestAnimationFrame(updateFocusedIdx);
    scroller.addEventListener('scroll', handleScroll, _EVT_PASSIVE);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener('scroll', handleScroll);
    };
  }, [renderableLines.length, updateFocusedIdx]);
  if (renderableLines.length === 0) return null;
  return (
    <div className={`relative flex-shrink-0 ${isDesktop ? 'h-[256px] lg:h-[272px]' : 'h-[192px]'}`}>
      {' '}
      <div
        className={`relative z-20 flex h-full flex-col ${isDesktop ? 'px-8 pb-5 pt-3' : 'px-5 pb-4 pt-2'}`}
      >
        <div
          ref={scrollerRef}
          className={`lyrics-reel custom-scrollbar h-full overflow-y-auto snap-y snap-mandatory ${isDesktop ? 'px-4' : 'px-2'}`}
          style={_LYRICS_MASK_STYLE}
        >
          <div className="flex min-h-full flex-col justify-center py-14">
            {' '}
            {renderableLines.map((line, index) => {
              const ei =
                activeIdx >= 0 && index === activeIdx
                  ? 0
                  : Math.min(Math.abs(index - focusedIdx), 3) + 1;
              return (
                <LyricReelLine
                  key={line.id}
                  lineId={line.id}
                  index={index}
                  text={line.text}
                  emphasisIdx={ei}
                  isDesktop={isDesktop}
                  lineRefs={lineRefs}
                  scrollToIndex={scrollToIndex}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
interface SpiralRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  sensitivity?: number;
  demo?: boolean;
}
const NUM_BARS = 128;
const _EMPTY_F64 = () => new Float64Array(NUM_BARS);
const _BASS_CURVE_LEN = 4096;
const _BASS_CURVE = new Float32Array(_BASS_CURVE_LEN);
for (let i = 0; i < _BASS_CURVE_LEN; i++) {
  const x = (i * 2) / _BASS_CURVE_LEN - 1;
  _BASS_CURVE[i] = ((Math.PI + 2) * x) / (Math.PI + 2 * Math.abs(x));
}
const CYCLES = 4;
const SMOOTH_PASSES = 1;
function SpiralRenderer({
  frequencyDataRef,
  className = '',
  color1 = '#ff4b1f',
  color2 = '#ff9068',
  color3 = '#f9d423',
  sensitivity = 1.0,
  demo = false,
}: SpiralRendererProps) {
  const rotationRef = useRef(0);
  const dataArrayRef = useRef<Float64Array>(null!);
  const targetArrayRef = useRef<Float64Array>(null!);
  const smoothedRef = useRef<Float64Array>(null!);
  const tempRef = useRef<Float64Array>(null!);
  const outerXRef = useRef<Float64Array>(null!);
  const outerYRef = useRef<Float64Array>(null!);
  const innerXRef = useRef<Float64Array>(null!);
  const innerYRef = useRef<Float64Array>(null!);
  if (!dataArrayRef.current) {
    dataArrayRef.current = _EMPTY_F64();
    targetArrayRef.current = _EMPTY_F64();
    smoothedRef.current = _EMPTY_F64();
    tempRef.current = _EMPTY_F64();
    outerXRef.current = _EMPTY_F64();
    outerYRef.current = _EMPTY_F64();
    innerXRef.current = _EMPTY_F64();
    innerYRef.current = _EMPTY_F64();
  }
  const colorsRef = useRef({ color1, color2, color3 });
  useEffect(() => {
    colorsRef.current = { color1, color2, color3 };
    // Invalidate cached gradient when colors change
    gradientCacheRef.current = null;
  }, [color1, color2, color3]);
  // Cached gradient — recreated only when colors or canvas size changes
  const gradientCacheRef = useRef<{ grad: CanvasGradient; w: number; h: number } | null>(null);
  const canvasRef = useCanvasLoop(frequencyDataRef, (ctx, w, h, freqData) => {
    const centerX = w / 2;
    const centerY = h / 2;
    const data = dataArrayRef.current;
    const target = targetArrayRef.current;
    const frequencyData = freqData;
    if (frequencyData && frequencyData.length > 0) {
      for (let i = 0; i < NUM_BARS; i++) {
        const srcIdx = Math.min(
          Math.floor((i / NUM_BARS) * frequencyData.length),
          frequencyData.length - 1,
        );
        target[i] = (frequencyData[srcIdx] / 255) * sensitivity;
        data[i] += (target[i] - data[i]) * 0.15;
      }
    } else if (demo) {
      for (let i = 0; i < NUM_BARS; i++) {
        if (Math.random() < 0.08) {
          const maxVal = i < NUM_BARS / 3 ? 1.0 : 0.6;
          target[i] = Math.random() * maxVal * sensitivity;
        }
        data[i] += (target[i] - data[i]) * 0.1;
      }
    } else {
      for (let i = 0; i < NUM_BARS; i++) {
        data[i] *= 0.95;
      }
    }
    const smoothed = smoothedRef.current;
    const temp = tempRef.current;
    let src = data;
    let dst = smoothed;
    for (let pass = 0; pass < SMOOTH_PASSES; pass++) {
      for (let i = 0; i < NUM_BARS; i++) {
        const prev = src[i > 0 ? i - 1 : 0];
        const next = src[i < NUM_BARS - 1 ? i + 1 : NUM_BARS - 1];
        dst[i] = prev * 0.25 + src[i] * 0.5 + next * 0.25;
      }
      const swap = src === data ? temp : src;
      src = dst;
      dst = swap;
    }
    const result = src;
    const maxAngle = CYCLES * Math.PI * 2;
    const minRadius = Math.max(w, h) * 0.01;
    const maxRadius = Math.sqrt(w * w + h * h) * 0.8;
    const b = Math.log(maxRadius / minRadius) / maxAngle;
    rotationRef.current += 0.0015;
    const rotation = rotationRef.current;
    ctx.clearRect(0, 0, w, h);
    const { color1: c1, color2: c2, color3: c3 } = colorsRef.current;
    // Reuse cached gradient unless canvas size changed
    let fillStyle: string | CanvasGradient = c1;
    const gc = gradientCacheRef.current;
    if (gc && gc.w === w && gc.h === h) {
      fillStyle = gc.grad;
    } else {
      try {
        const gradient = ctx.createLinearGradient(
          centerX - maxRadius,
          centerY - maxRadius,
          centerX + maxRadius,
          centerY + maxRadius,
        );
        gradient.addColorStop(0, c1);
        gradient.addColorStop(0.5, c2);
        gradient.addColorStop(1, c3);
        fillStyle = gradient;
        gradientCacheRef.current = { grad: gradient, w, h };
      } catch {
        /* fallback to solid color */
      }
    }
    const outerX = outerXRef.current;
    const outerY = outerYRef.current;
    const innerX = innerXRef.current;
    const innerY = innerYRef.current;
    for (let i = 0; i < NUM_BARS; i++) {
      const val = result[i];
      const scaleFactor = 0.5 + 1.5 * (i / NUM_BARS);
      const barHeight = val * (Math.max(w, h) * 0.08) * scaleFactor;
      const baseAngle = (i / NUM_BARS) * maxAngle;
      const radius = minRadius * Math.exp(b * baseAngle);
      const finalAngle = baseAngle + rotation;
      const cos = Math.cos(finalAngle);
      const sin = Math.sin(finalAngle);
      innerX[i] = centerX + cos * radius;
      innerY[i] = centerY + sin * radius;
      outerX[i] = centerX + cos * (radius + barHeight + 2);
      outerY[i] = centerY + sin * (radius + barHeight + 2);
    }
    ctx.fillStyle = fillStyle;
    // shadowBlur removed — extremely expensive on iOS Safari (forces Gaussian blur on every fill)
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 0.85;
    const barsPerCycle = Math.ceil(NUM_BARS / CYCLES);
    for (let c = 0; c < CYCLES; c++) {
      const startIdx = c * barsPerCycle;
      const endIdx = Math.min((c + 1) * barsPerCycle + 2, NUM_BARS);
      if (startIdx >= NUM_BARS) break;
      ctx.beginPath();
      ctx.moveTo(outerX[startIdx], outerY[startIdx]);
      for (let i = startIdx + 1; i < endIdx - 1; i++) {
        const xc = (outerX[i] + outerX[i + 1]) / 2;
        const yc = (outerY[i] + outerY[i + 1]) / 2;
        ctx.quadraticCurveTo(outerX[i], outerY[i], xc, yc);
      }
      if (endIdx - 1 > startIdx) ctx.lineTo(outerX[endIdx - 1], outerY[endIdx - 1]);
      ctx.lineTo(innerX[endIdx - 1], innerY[endIdx - 1]);
      for (let i = endIdx - 2; i > startIdx; i--) {
        const xc = (innerX[i] + innerX[i - 1]) / 2;
        const yc = (innerY[i] + innerY[i - 1]) / 2;
        ctx.quadraticCurveTo(innerX[i], innerY[i], xc, yc);
      }
      ctx.lineTo(innerX[startIdx], innerY[startIdx]);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  });
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={_BLUR_6_STYLE}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        style={_CANVAS_SCALE_STYLE}
      />
    </div>
  );
}
const FALLBACK_COLORS: [string, string, string] = ['#ff4b1f', '#ff9068', '#f9d423'];
const Badge = ({
  mono,
  upper,
  children,
}: {
  mono?: boolean;
  upper?: boolean;
  children: React.ReactNode;
}) => (
  <span
    className={`px-2 py-0.5 rounded-full bg-white/10 text-[11px] text-white/50${mono ? ' font-mono' : ''}${upper ? ' uppercase' : ''}`}
  >
    {children}
  </span>
);
type TheaterViewProps = {
  station: Station;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null;
  icyBitrate?: string | null;
  onBack: () => void;
  onToggleFav?: () => void;
  isFavorite?: boolean;
  onFavSong?: () => void;
  isSongLiked?: boolean;
  lyrics?: LyricsData | null;
  currentTime?: number;
  activeLineOverride?: number;
  lyricsVariant?: 'mobile' | 'desktop';
  compact?: boolean;
};
const _colorCache = new Map<string, Promise<[string, string, string]>>();
const MAX_COLOR_CACHE = 32;
/** Extract the top-2 saturated hues from an artwork image for use as spiral colors. */ function extractColors(
  imgUrl: string,
): Promise<[string, string, string]> {
  const cached = _colorCache.get(imgUrl);
  if (cached) return cached;
  const p = new Promise<[string, string, string]>((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(FALLBACK_COLORS);
        ctx.drawImage(img, 0, 0, size, size);
        const data = ctx.getImageData(0, 0, size, size).data;
        const buckets: Record<number, number> = {};
        for (let i = 0; i < data.length; i += 12) {
          const r = data[i],
            g = data[i + 1],
            b = data[i + 2];
          const mx = r > g ? (r > b ? r : b) : g > b ? g : b;
          const mn = r < g ? (r < b ? r : b) : g < b ? g : b;
          const chroma = mx - mn;
          if (chroma < 25) continue;
          if (chroma / mx < 0.2) continue;
          let h = 0;
          if (mx === r) h = 60 * (((g - b) / chroma) % 6);
          else if (mx === g) h = 60 * ((b - r) / chroma + 2);
          else h = 60 * ((r - g) / chroma + 4);
          if (h < 0) h += 360;
          const bucket = Math.round(h / 30) * 30;
          buckets[bucket] = (buckets[bucket] || 0) + 1;
        }
        // Top-3 linear scan instead of full sort
        let h1 = -1,
          h2 = -1,
          h3 = -1,
          c1 = 0,
          c2 = 0,
          c3 = 0;
        for (const k in buckets) {
          const v = buckets[k];
          if (v > c1) {
            h3 = h2;
            c3 = c2;
            h2 = h1;
            c2 = c1;
            h1 = +k;
            c1 = v;
          } else if (v > c2) {
            h3 = h2;
            c3 = c2;
            h2 = +k;
            c2 = v;
          } else if (v > c3) {
            h3 = +k;
            c3 = v;
          }
        }
        if (h1 < 0) return resolve(FALLBACK_COLORS);
        if (h2 < 0) h2 = (h1 + 120) % 360;
        if (h3 < 0) h3 = (h1 + 240) % 360;
        resolve([`hsl(${h1}, 75%, 55%)`, `hsl(${h2}, 65%, 50%)`, `hsl(${h3}, 60%, 45%)`]);
      } catch {
        resolve(FALLBACK_COLORS);
      }
    };
    img.onerror = () => resolve(FALLBACK_COLORS);
    img.src = imgUrl;
  });
  if (_colorCache.size >= MAX_COLOR_CACHE) {
    const first = _colorCache.keys().next().value;
    if (first !== undefined) _colorCache.delete(first);
  }
  _colorCache.set(imgUrl, p);
  return p;
}
/** Merged CRT overlay: scanlines + vignette + glare in a single DOM node (saves 2 composite layers). */
const _CRT_COMBINED_STYLE: React.CSSProperties = {
  background:
    'radial-gradient(circle, rgba(0,0,0,0) 50%, rgba(0,0,0,0.7) 100%), ' +
    'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 40%), ' +
    'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.18) 50%), ' +
    'linear-gradient(90deg, rgba(255,0,0,0.04), rgba(0,255,0,0.01), rgba(0,0,255,0.04))',
  backgroundSize: '100% 100%, 100% 100%, 100% 4px, 6px 100%',
  boxShadow: 'inset 0 0 40px rgba(0,0,0,0.7)',
};
const _SAFE_AREA_TOP_STYLE: React.CSSProperties = { top: 'env(safe-area-inset-top, 0px)' };
const _BLUR_6_STYLE: React.CSSProperties = { opacity: 0.75 };
const _CANVAS_SCALE_STYLE: React.CSSProperties = { imageRendering: 'auto' };
const _IMAGE_RENDER_STYLE: React.CSSProperties = { imageRendering: 'auto' };
const _SAFE_AREA_BOTTOM_STYLE: React.CSSProperties = { height: 'env(safe-area-inset-bottom, 0px)' };
const _OBJECT_COVER_STYLE: React.CSSProperties = { objectFit: 'cover' };
const _GLASS_SETTINGS_STYLE: React.CSSProperties = {
  background: 'rgba(22, 24, 35, 0.92)',
  backdropFilter: 'blur(24px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(24px) saturate(1.6)',
};
const _GLASS_PANEL_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
};
const _MAX_WIDTH_200_STYLE: React.CSSProperties = { maxWidth: '200px' };
const _GLASS_BADGE_STYLE: React.CSSProperties = {
  background: 'rgba(10, 15, 26, 0.7)',
  backdropFilter: 'blur(16px) saturate(1.3)',
  WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
  border: '1px solid rgba(255,255,255,0.06)',
};
const _MOTION_FADE_IN = { opacity: 0 } as const;
const _MOTION_FADE_VISIBLE = { opacity: 1 } as const;
const _MOTION_FADE_OUT = { opacity: 0 } as const;
const _MOTION_SLIDE_UP_INIT = { y: '100%' } as const;
const _MOTION_SLIDE_UP_VISIBLE = { y: 0 } as const;
const _MOTION_SLIDE_UP_EXIT = { y: '100%' } as const;
const _MOTION_T_02 = { duration: 0.2 } as const;
const _MOTION_T_03 = { duration: 0.3 } as const;
const _MOTION_T_SPRING = { type: 'spring' as const, damping: 28, stiffness: 300 };
function TheaterView({
  station,
  track,
  isPlaying,
  frequencyDataRef,
  artworkUrl,
  icyBitrate,
  onBack,
  onToggleFav,
  isFavorite,
  onFavSong,
  isSongLiked,
  lyrics,
  currentTime,
  activeLineOverride,
  lyricsVariant = 'mobile',
  compact,
}: TheaterViewProps) {
  const [failedCoverUrl, setFailedCoverUrl] = useState<string | null>(null);
  const [colors, setColors] = useState<[string, string, string]>(FALLBACK_COLORS);
  const lastUrlRef = useRef<string | null>(null);
  const coverUrl = artworkUrl ?? station.favicon;
  const showFallback = !coverUrl || failedCoverUrl === coverUrl;
  useEffect(() => {
    if (!artworkUrl || artworkUrl === lastUrlRef.current) return;
    lastUrlRef.current = artworkUrl;
    let cancelled = false;
    extractColors(artworkUrl).then((c) => {
      if (!cancelled) setColors(c);
    });
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);
  const [color1, color2, color3] = colors;
  const theaterTags = useMemo(() => _tagsDisplay(station.tags), [station.tags]);
  const { concerts } = useConcerts(track?.artist, !compact);
  return (
    <motion.div
      initial={_MOTION_FADE_IN}
      animate={_MOTION_FADE_VISIBLE}
      exit={_MOTION_FADE_OUT}
      transition={_MOTION_T_03}
      className="flex flex-col h-full w-full relative overflow-hidden"
    >
      {' '}
      {/* ── Layer 1: solid dark background ── */} <div className="absolute inset-0 bg-[#0f172a]" />{' '}
      {/* ── Layer 1.5: album art background with ambient drift ── */}{' '}
      {coverUrl && failedCoverUrl !== coverUrl && (
        <div className="absolute inset-0 z-2 pointer-events-none overflow-hidden">
          <UiImage
            src={coverUrl}
            alt=""
            className="object-cover animate-ambient-drift blur-sm opacity-20"
            sizes="100vw"
            onError={() => setFailedCoverUrl(coverUrl)}
          />{' '}
          <div className="absolute inset-0 bg-linear-to-t from-[#0f172a] via-[#0f172a]/40 to-[#0f172a]/60" />
        </div>
      )}{' '}
      {/* ── Layer 2: Fibonacci/logarithmic spiral visualizer (blurred, fills screen) ── */}{' '}
      <div className="absolute inset-0 z-5 pointer-events-none">
        <ErrorBoundary fallback={null}>
          <SpiralRenderer
            frequencyDataRef={frequencyDataRef}
            className="size-full"
            color1={color1}
            color2={color2}
            color3={color3}
            sensitivity={compact ? 0.8 : 1.2}
            demo
          />
        </ErrorBoundary>
      </div>{' '}
      {/* ── Layer 3: CRT scanlines + vignette overlay (merged into one div) ── */}{' '}
      <div
        className="absolute inset-0 z-6 pointer-events-none"
        style={_CRT_COMBINED_STYLE}
      />{' '}
      {/* ── Top controls (back + favorites) — offset by safe-area-inset-top ── */}{' '}
      {!compact && (
        <div
          className="absolute left-0 right-0 z-20 flex items-start justify-between px-4 pt-4"
          style={_SAFE_AREA_TOP_STYLE}
        >
          <button
            onClick={onBack}
            className="flex-row-2 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10 text-soft hover:text-white hover:bg-black/50 transition-all text-[13px]"
            aria-label="Exit theater mode"
          >
            <ArrowLeft size={16} />
          </button>{' '}
          <div className="flex flex-row gap-2 sm:flex-col">
            {onToggleFav && (
              <button
                onClick={onToggleFav}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${isFavorite ? 'bg-sys-orange/20 border-sys-orange/40 text-sys-orange' : 'bg-black/30 border-white/10 text-soft hover:text-white hover:bg-black/50'}`}
                aria-label="Favorite station"
                aria-pressed={!!isFavorite}
              >
                <Star size={16} className={isFavorite ? 'fill-sys-orange' : ''} />
              </button>
            )}{' '}
            {onFavSong && track && (
              <button
                onClick={onFavSong}
                className={`p-2 rounded-full backdrop-blur-md border transition-all ${isSongLiked ? 'bg-pink-500/20 border-pink-400/40 text-pink-400' : 'bg-black/30 border-white/10 text-soft hover:text-pink-400 hover:bg-black/50'}`}
                aria-label="Favorite song"
                aria-pressed={!!isSongLiked}
              >
                <Heart size={16} className={isSongLiked ? 'fill-pink-400' : ''} />
              </button>
            )}
          </div>
        </div>
      )}{' '}
      {/* ── Layer 4: content — glassmorphism panel centered over the spiral ── */}{' '}
      <div className="flex-1 flex items-center justify-center relative z-10 px-4">
        <div
          className={`flex flex-col items-center ${compact ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-5'} rounded-3xl max-w-sm w-full`}
          style={{
            background: 'rgba(0, 0, 0, 0.35)',
            backdropFilter: 'blur(12px) saturate(1.3)',
            WebkitBackdropFilter: 'blur(12px) saturate(1.3)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: `0 8px 48px rgba(0,0,0,0.6), 0 0 80px ${color1}25`,
          }}
        >
          {' '}
          {/* Corner metadata badges (panel corners, never over album art) */}{' '}
          {!compact && (
            <div className="w-full grid grid-cols-2 items-start">
              <div className="justify-self-start">
                {' '}
                {track?.durationMs && (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[12px] font-mono text-white/80 inline-flex items-center gap-1">
                    {' '}
                    <Clock size={10} /> {formatDuration(track.durationMs)}
                  </span>
                )}
              </div>
              <div className="justify-self-end">
                {' '}
                {track?.trackNumber != null && track?.trackCount != null && (
                  <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[12px] font-medium text-white/80">
                    {' '}
                    #{track.trackNumber}/{track.trackCount}
                  </span>
                )}
              </div>
            </div>
          )}{' '}
          {/* Cover art */}{' '}
          <div
            className={`${compact ? 'w-14 h-14 rounded-xl' : 'w-36 h-36 sm:w-44 sm:h-44 rounded-2xl'} relative overflow-hidden flex-center-row flex-shrink-0`}
            style={{ boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 48px ${color1}50` }}
          >
            {' '}
            {showFallback ? (
              <div className="size-full dawn-gradient flex-center-row">
                <span
                  className={`${compact ? 'text-base' : 'text-4xl'} text-white/90 font-bold select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]`}
                >
                  {stationInitials(station.name) || (
                    <RadioIcon size={compact ? 24 : 52} className="text-white/60" />
                  )}
                </span>
              </div>
            ) : (
              <UiImage
                src={coverUrl}
                alt=""
                className="object-cover"
                sizes={compact ? '56px' : '176px'}
                loading="lazy"
                onError={() => setFailedCoverUrl(coverUrl)}
              />
            )}
          </div>{' '}
          {/* Station name */}{' '}
          <h2
            className={`${compact ? 'text-[11px] mb-0' : 'text-lg sm:text-xl mb-0'} font-bold text-white text-center drop-shadow-lg line-clamp-2 leading-tight`}
          >
            {station.name}
          </h2>{' '}
          {/* Track info */}{' '}
          {track?.title ? (
            <p
              className={`${compact ? 'text-[11px]' : 'text-[13px] sm:text-[14px]'} text-white/70 text-center line-clamp-2 leading-snug`}
            >
              {track.artist ? `${track.artist} — ${track.title}` : track.title}
            </p>
          ) : (
            <p className={`${compact ? 'text-[11px]' : 'text-[12px]'} text-white/50 text-center`}>
              {theaterTags}
            </p>
          )}{' '}
          {track?.album && (
            <p
              className={`${compact ? 'text-[11px]' : 'text-[11px]'} text-white/50 text-center line-clamp-1`}
            >
              {' '}
              {track.album}
            </p>
          )}{' '}
          {!compact && track?.releaseDate && (
            <p className="text-[12px] text-white/50 text-center -mt-1">
              {' '}
              Released on: {formatReleaseDate(track.releaseDate)}
            </p>
          )}{' '}
          {/* LIVE badge */}{' '}
          {isPlaying && (
            <div className={`flex-row-2 ${compact ? 'mt-0' : 'mt-1'}`}>
              {' '}
              <span className={`${compact ? 'dot-1.5' : 'dot-2'} bg-red-500 animate-pulse`} />{' '}
              <span
                className={`${compact ? 'text-[11px]' : 'text-[11px]'} font-semibold tracking-wider uppercase text-red-400`}
              >
                LIVE
              </span>
              {!compact && <AnimatedBars size="small" />}
            </div>
          )}{' '}
          {/* Station details badges */}{' '}
          {!compact && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-1">
              {' '}
              {station.codec && (
                <Badge mono upper>
                  {station.codec}
                </Badge>
              )}{' '}
              {(icyBitrate || station.bitrate > 0) && (
                <Badge mono>{icyBitrate ?? station.bitrate}kbps</Badge>
              )}{' '}
              {station.country && <Badge>{station.country}</Badge>}{' '}
              {track?.genre && <Badge>{track.genre}</Badge>}
            </div>
          )}{' '}
          {/* Listen on Apple Music */}{' '}
          {!compact && track && (
            <a
              href={
                track.itunesUrl ||
                `https://music.apple.com/search?term=${encodeURIComponent(`${track.artist} ${track.title}`.trim())}&pt=pulse-radio&ct=www.pulse-radio.online`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-[12px] font-medium text-white/60 hover:text-white/80 transition-colors"
            >
              <ExternalLink size={11} /> Listen on Apple Music
            </a>
          )}{' '}
          {/* ── Upcoming concerts (Bandsintown) ── */}{' '}
          {!compact && concerts.length > 0 && (
            <div className="w-full mt-2">
              <p className="text-[12px] font-semibold tracking-widest uppercase text-white/50 text-center mb-1.5">
                Upcoming Shows
              </p>
              <div className="flex flex-col gap-1 w-full">
                {concerts.slice(0, 3).map((ev) => {
                  const d = new Date(ev.date);
                  const dateStr = isNaN(d.getTime())
                    ? ev.date
                    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                  const content = (
                    <div className="flex items-start justify-between gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[12px] font-medium text-white/80 truncate">{ev.venue}</span>
                        <span className="text-[12px] text-white/50 truncate">{ev.city}{ev.country ? `, ${ev.country}` : ''}</span>
                      </div>
                      <span className="text-[12px] text-white/50 shrink-0 mt-0.5">{dateStr}</span>
                    </div>
                  );
                  return ev.ticketUrl ? (
                    <a
                      key={ev.id}
                      href={ev.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block min-h-[44px]"
                      aria-label={`Get tickets for ${ev.venue} on ${dateStr}`}
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={ev.id} className="min-h-[44px]">{content}</div>
                  );
                })}
              </div>
            </div>
          )}{' '}
          {/* ── Lyrics reel inside glass panel ── */}{' '}
          {!compact && (
            <div className={`w-full ${lyricsVariant === 'desktop' ? 'px-2 pb-2' : 'px-0 pb-1'}`}>
              <LyricsReel
                lyrics={lyrics ?? null}
                currentTime={currentTime}
                activeLineOverride={activeLineOverride}
                variant={lyricsVariant}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
const cache = new LRU<ArtistInfo>(200);
function useArtistInfo(artist: string | null): { info: ArtistInfo | null; loading: boolean } {
  const key = artist ? artist.toLowerCase().trim() : '';
  const cachedInfo = useMemo(() => {
    if (!key) return null;
    return cache.get(key) ?? null;
  }, [key]);
  const [fetched, setFetched] = useState<{ key: string; info: ArtistInfo | null } | null>(null);
  useEffect(() => {
    if (!key || !artist || cachedInfo) return;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    fetch(`/api/artist-info?artist=${encodeURIComponent(artist)}`, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ArtistInfo) => {
        if (!cancelled) {
          cache.set(key, data);
          setFetched({ key, info: data });
        }
      })
      .catch(() => {
        if (!cancelled) setFetched({ key, info: null });
      })
      .finally(() => {
        clearTimeout(timeout);
      });
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [artist, key, cachedInfo]);
  const info = !key ? null : (cachedInfo ?? (fetched?.key === key ? fetched.info : null));
  return { info, loading: Boolean(key && !cachedInfo && fetched?.key !== key) };
}
const BADGE_CLS = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px]';
const MetaBadge = ({
  icon: Icon,
  cls,
  children,
}: {
  icon: typeof Clock;
  cls: string;
  children: React.ReactNode;
}) => (
  <span className={`${BADGE_CLS} ${cls}`}>
    <Icon size={9} />
    {children}
  </span>
);
type SongDetailModalProps = {
  song: SongDetailData | null;
  onClose: () => void;
  onRemoveFromFavorites?: () => void;
};
const _SKELETON_WIDTHS = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-8/12', 'w-10/12', 'w-7/12'];
function _SongDetailModal({ song, onClose, onRemoveFromFavorites }: SongDetailModalProps) {
  const { info, loading } = useArtistInfo(song?.artist ?? null);
  const albumMeta = useAlbumArt(song?.title ?? null, song?.artist ?? null);
  const resolvedArtworkUrl = song?.artworkUrl ?? albumMeta.artworkUrl ?? undefined;
  const resolvedAlbum = song?.album ?? albumMeta.albumName ?? undefined;
  const resolvedItunesUrl = song?.itunesUrl ?? albumMeta.itunesUrl ?? undefined;
  const resolvedDurationMs = song?.durationMs ?? albumMeta.durationMs ?? null;
  const resolvedGenre = song?.genre ?? albumMeta.genre ?? null;
  const resolvedReleaseDate = song?.releaseDate ?? albumMeta.releaseDate ?? null;
  const resolvedTrackNumber = song?.trackNumber ?? albumMeta.trackNumber ?? null;
  const resolvedTrackCount = song?.trackCount ?? albumMeta.trackCount ?? null;
  const showMetaHydration =
    Boolean(
      song &&
      (song.durationMs == null ||
        song.genre == null ||
        song.releaseDate == null ||
        song.trackNumber == null ||
        song.trackCount == null),
    ) && albumMeta.isLoading;
  const {
    lyrics,
    loading: lyricsLoading,
    error: lyricsError,
    retry: retryLyrics,
  } = useLyrics(
    song ? { title: song.title, artist: song.artist, album: resolvedAlbum } : null,
    song?.stationName ?? null,
  );
  const plainLyrics = useMemo(
    () =>
      lyrics?.plainText?.trim() ||
      lyrics?.lines
        ?.map((line) => line.text.trim())
        .filter(Boolean)
        .join('\n')
        .trim() ||
      '',
    [lyrics],
  );
  const lyricsSkeleton = (n: number) => (
    <div className="space-y-2 animate-pulse">
      {' '}
      {_SKELETON_WIDTHS.slice(0, n).map((w, i) => (
        <div key={i} className={`h-2.5 bg-surface-3 rounded ${w}`} />
      ))}
    </div>
  );
  const lyricsEmpty = (
    <div>
      <p className="text-[12px] text-dim">
        {lyricsError ? 'Failed to load lyrics' : 'No lyrics available'}
      </p>{' '}
      {lyricsError && (
        <button
          onClick={retryLyrics}
          className="mt-2 px-3 py-1 text-[12px] rounded-md bg-sys-orange/20 text-sys-orange hover:bg-sys-orange/30 transition-colors"
        >
          {' '}
          Retry
        </button>
      )}
    </div>
  );
  useEffect(() => {
    if (!song) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [song, onClose]);
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!song || !modalRef.current) return;
    const modal = modalRef.current;
    const prev = document.activeElement as HTMLElement | null;
    const focusable = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onTab);
    return () => {
      window.removeEventListener('keydown', onTab);
      prev?.focus();
    };
  }, [song]);
  return (
    <AnimatePresence>
      {' '}
      {song && (
        <motion.div
          key="song-detail-backdrop"
          initial={_MOTION_FADE_IN}
          animate={_MOTION_FADE_VISIBLE}
          exit={_MOTION_FADE_OUT}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            key="song-detail-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Song details: ${song.title} by ${song.artist}`}
            initial={{ y: 30, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="w-full max-w-[860px] mx-4 md:flex md:items-stretch md:gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            {' '}
            <div className="bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-full max-w-[380px] max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
              {' '}
              {/* Close button */}{' '}
              <div className="sticky top-0 z-10 flex justify-end p-3">
                <button
                  onClick={onClose}
                  aria-label="Close song details"
                  className="p-2 rounded-full bg-surface-3/80 backdrop-blur-sm text-white/60 hover:text-white hover:bg-surface-4 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>{' '}
              {/* ── Song Info ── */}{' '}
              <div className="px-5 -mt-2">
                {/* Artwork */}{' '}
                <div className="relative w-full aspect-square max-w-[240px] mx-auto rounded-2xl overflow-hidden bg-surface-3 shadow-xl">
                  {' '}
                  {resolvedArtworkUrl ? (
                    <UiImage
                      src={resolvedArtworkUrl}
                      alt={`Album art for ${song.title} by ${song.artist}`}
                      className="object-cover"
                      sizes="240px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      {' '}
                      <Music size={56} className="text-dim" />
                    </div>
                  )}
                </div>{' '}
                {/* Title & artist */}{' '}
                <div className="mt-5 text-center">
                  {' '}
                  <h2 className="text-[17px] font-bold text-white leading-snug line-clamp-2">
                    {song.title}
                  </h2>{' '}
                  <p className="text-[14px] text-secondary mt-1">{song.artist}</p>{' '}
                  {resolvedAlbum && <p className="text-[12px] text-dim mt-0.5">{resolvedAlbum}</p>}{' '}
                  {/* Extended metadata: corner-style row + release line + context badges */}{' '}
                  {(resolvedDurationMs ||
                    resolvedTrackNumber != null ||
                    resolvedReleaseDate ||
                    resolvedGenre) && (
                    <div className="mt-2 space-y-1.5">
                      <div className="grid grid-cols-2 items-start">
                        {' '}
                        <div className="justify-self-start">
                          {resolvedDurationMs && (
                            <MetaBadge
                              icon={Clock}
                              cls="bg-white/[0.08] border border-white/10 font-mono text-white/70"
                            >
                              {formatDuration(resolvedDurationMs)}
                            </MetaBadge>
                          )}
                        </div>
                        <div className="justify-self-end">
                          {' '}
                          {resolvedTrackNumber != null && resolvedTrackCount != null && (
                            <MetaBadge
                              icon={Disc3}
                              cls="bg-white/[0.08] border border-white/10 text-white/70"
                            >
                              #{resolvedTrackNumber}/{resolvedTrackCount}
                            </MetaBadge>
                          )}
                        </div>
                      </div>{' '}
                      {resolvedReleaseDate && (
                        <p className="text-[12px] text-white/50">
                          {' '}
                          Released on: {formatReleaseDate(resolvedReleaseDate)}
                        </p>
                      )}{' '}
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {' '}
                        {resolvedGenre && (
                          <MetaBadge icon={Tag} cls="bg-white/[0.06] text-white/50">
                            {resolvedGenre}
                          </MetaBadge>
                        )}{' '}
                        {showMetaHydration && (
                          <MetaBadge icon={Clock} cls="bg-white/[0.06] text-white/40 animate-pulse">
                            Fetching metadata…
                          </MetaBadge>
                        )}{' '}
                      </div>
                    </div>
                  )}
                </div>{' '}
                {/* Apple Music button */}{' '}
                <a
                  href={resolvedItunesUrl || itunesSearchUrl(song.title, song.artist)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[13px] font-medium text-white/70 hover:text-white transition-colors"
                >
                  <ExternalLink size={14} /> Listen on Apple Music
                </a>
              </div>{' '}
              {/* Divider */} <div className="mx-5 my-5 border-t border-border-default" />{' '}
              {/* ── Artist Info ── */}{' '}
              <div className="px-5">
                <h3 className="text-[11px] font-semibold text-dim uppercase tracking-wider mb-3">
                  {' '}
                  About {song.artist}
                </h3>{' '}
                {/* Loading skeleton */}{' '}
                {loading && (
                  <div className="space-y-3 animate-pulse">
                    <div className="flex gap-3">
                      {' '}
                      <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0" />{' '}
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-surface-3 rounded w-2/3" />{' '}
                        <div className="h-2.5 bg-surface-3 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      {' '}
                      <div className="h-2.5 bg-surface-3 rounded w-full" />{' '}
                      <div className="h-2.5 bg-surface-3 rounded w-5/6" />{' '}
                      <div className="h-2.5 bg-surface-3 rounded w-4/6" />
                    </div>
                  </div>
                )}{' '}
                {/* Loaded artist data */}{' '}
                {!loading && info && (
                  <div className="space-y-3">
                    {' '}
                    {/* Artist header with image */}{' '}
                    <div className="flex gap-3">
                      {info.imageUrl ? (
                        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <UiImage
                            src={info.imageUrl}
                            alt={info.name}
                            className="object-cover bg-surface-3"
                            sizes="64px"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-surface-3 flex-shrink-0 flex items-center justify-center">
                          {' '}
                          {info.type === 'Group' ? (
                            <Users size={24} className="text-dim" />
                          ) : (
                            <User size={24} className="text-dim" />
                          )}
                        </div>
                      )}{' '}
                      <div className="flex-1 min-w-0 pt-0.5">
                        {' '}
                        <p className="text-[14px] font-semibold text-white truncate">
                          {info.name}
                        </p>{' '}
                        {info.disambiguation && (
                          <p className="text-[11px] text-dim mt-0.5 line-clamp-1">
                            {info.disambiguation}
                          </p>
                        )}{' '}
                        {/* Metadata badges */}{' '}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {' '}
                          {info.type && (
                            <MetaBadge
                              icon={info.type === 'Group' ? Users : User}
                              cls="bg-surface-3 text-secondary"
                            >
                              {info.type}
                            </MetaBadge>
                          )}{' '}
                          {info.country && (
                            <MetaBadge icon={Globe} cls="bg-surface-3 text-secondary">
                              {info.country}
                            </MetaBadge>
                          )}{' '}
                          {info.lifeSpan?.begin && (
                            <MetaBadge icon={Calendar} cls="bg-surface-3 text-secondary">
                              {' '}
                              {info.lifeSpan.begin}
                              {info.lifeSpan.ended && info.lifeSpan.end
                                ? ` – ${info.lifeSpan.end}`
                                : ' – present'}{' '}
                            </MetaBadge>
                          )}
                        </div>
                      </div>
                    </div>{' '}
                    {/* Bio */}{' '}
                    {info.bio && (
                      <p className="text-[12px] text-secondary/90 leading-relaxed">{info.bio}</p>
                    )}{' '}
                    {/* Genre tags */}{' '}
                    {info.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {' '}
                        {info.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2.5 py-1 rounded-full bg-white/[0.06] text-[11px] font-medium text-white/50"
                          >
                            {' '}
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}{' '}
                    {/* Wikipedia link */}{' '}
                    {info.wikipediaUrl && (
                      <a
                        href={info.wikipediaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[12px] text-blue-400/70 hover:text-blue-400 transition-colors"
                      >
                        <Globe size={11} /> Read more on Wikipedia
                      </a>
                    )}
                  </div>
                )}{' '}
                {/* No data */}{' '}
                {!loading && !info && (
                  <p className="text-[12px] text-dim">No artist information available</p>
                )}
              </div>{' '}
              {/* Divider */} <div className="mx-5 my-5 border-t border-border-default" />{' '}
              {/* ── Lyrics (mobile) ── */}{' '}
              <div className="px-5 md:hidden">
                {' '}
                <h3 className="text-[12px] font-semibold text-dim uppercase tracking-wider mb-3">
                  Lyrics (plain)
                </h3>{' '}
                {lyricsLoading && lyricsSkeleton(4)}{' '}
                {!lyricsLoading && plainLyrics && (
                  <div className="max-h-52 overflow-y-auto rounded-xl bg-surface-3/50 border border-border-subtle p-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                    {' '}
                    <pre className="whitespace-pre-wrap break-words font-sans text-[12px] leading-relaxed text-secondary/90">
                      {' '}
                      {plainLyrics}
                    </pre>
                  </div>
                )}{' '}
                {!lyricsLoading && !plainLyrics && lyricsEmpty}
              </div>{' '}
              {/* Divider (mobile) */}{' '}
              <div className="mx-5 my-5 border-t border-border-default md:hidden" />{' '}
              {/* ── Remove from favorites ── */}{' '}
              {onRemoveFromFavorites && (
                <>
                  <div className="mx-5 my-5 border-t border-border-default" />{' '}
                  <div className="px-5 pb-2">
                    <button
                      onClick={onRemoveFromFavorites}
                      className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-[13px] font-medium text-red-400 hover:text-red-300 transition-colors border border-red-500/20"
                    >
                      <Trash2 size={14} /> Borrar de favoritos
                    </button>
                  </div>
                </>
              )}{' '}
              {/* ── Station ── */}{' '}
              <div className="px-5 pb-6 pt-4">
                <div className="flex items-center gap-2">
                  {' '}
                  <RadioIcon size={12} className="text-dim flex-shrink-0" />{' '}
                  <p className="text-[12px] text-dim">
                    {' '}
                    Played on <span className="text-secondary">{song.stationName}</span>
                  </p>
                </div>
              </div>
            </div>{' '}
            {/* ── Lyrics side panel (desktop) ── */}{' '}
            <div className="hidden md:flex md:flex-col bg-surface-2 rounded-2xl border border-border-default shadow-2xl w-[420px] max-h-[85vh]">
              {' '}
              <div className="px-5 pt-5 pb-3 border-b border-border-default">
                {' '}
                <h3 className="text-[12px] font-semibold text-dim uppercase tracking-wider">
                  Lyrics (plain)
                </h3>{' '}
                <p className="text-[12px] text-dim mt-1 line-clamp-1">
                  {song.title} · {song.artist}
                </p>
              </div>{' '}
              <div className="flex-1 p-5 overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
                {' '}
                {lyricsLoading && lyricsSkeleton(7)}{' '}
                {!lyricsLoading && plainLyrics && (
                  <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-secondary/90">
                    {' '}
                    {plainLyrics}
                  </pre>
                )}{' '}
                {!lyricsLoading && !plainLyrics && lyricsEmpty}
              </div>
            </div>
          </motion.div>{' '}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const SongDetailModal = React.memo(_SongDetailModal);
function hexToRgb(hex: string): [number, number, number] {
  const num = parseInt(hex.charAt(0) === '#' ? hex.slice(1) : hex, 16);
  return [(num >> 16) & 0xff, (num >> 8) & 0xff, num & 0xff];
}
interface FerrofluidRendererProps {
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  className?: string;
  blobCount?: number;
  colorPrimary?: string;
  colorSecondary?: string;
  colorAccent?: string;
  sensitivity?: number;
  /** standalone demo mode — generates its own animation without audio */ demo?: boolean;
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
interface Blob {
  x: number;
  y: number;
  baseRadius: number;
  /** Per-blob random size factor (0–1), assigned once at creation */ sizeFactor: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  freqBand: number;
}
function createBlobs(count: number, w: number, h: number): Blob[] {
  const blobs: Blob[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const dist = Math.min(w, h) * 0.15;
    blobs.push({
      x: cx + Math.cos(angle) * dist,
      y: cy + Math.sin(angle) * dist,
      baseRadius: Math.min(w, h) * (0.04 + Math.random() * 0.06),
      sizeFactor: Math.random(),
      targetX: cx,
      targetY: cy,
      vx: 0,
      vy: 0,
      phase: (i / count) * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.7,
      freqBand: Math.floor((i / count) * 128),
    });
  }
  return blobs;
}
let _offscreen: OffscreenCanvas | null = null;
let _imgData: ImageData | undefined;
function drawMetaballs(
  ctx: CanvasRenderingContext2D,
  blobs: Blob[],
  w: number,
  h: number,
  colors: {
    primary: [number, number, number];
    secondary: [number, number, number];
    accent: [number, number, number];
  },
  energy: number,
) {
  const threshold = 1.0;
  const scale = 3;
  const sw = Math.ceil(w / scale);
  const sh = Math.ceil(h / scale);
  if (!_offscreen || _offscreen.width !== sw || _offscreen.height !== sh) {
    _offscreen = new OffscreenCanvas(sw, sh);
    _imgData = undefined;
  }
  const offCtx = _offscreen.getContext('2d', { willReadFrequently: true });
  if (!offCtx) return;
  if (!_imgData || _imgData.width !== sw || _imgData.height !== sh) {
    try {
      _imgData = offCtx.createImageData(sw, sh);
    } catch {
      return;
    }
  }
  const sd = _imgData.data;
  const blobCount = blobs.length;
  const blobMaxDistSq = new Float64Array(blobCount);
  for (let b = 0; b < blobCount; b++) {
    const r = blobs[b].baseRadius;
    blobMaxDistSq[b] = r * r * 100;
  }
  const thresholdLow = threshold * 0.7;
  const glowRange = threshold * 0.3;
  for (let py = 0; py < sh; py++) {
    for (let px = 0; px < sw; px++) {
      const x = px * scale;
      const y = py * scale;
      let sum = 0;
      let weightedBand = 0;
      let totalWeight = 0;
      for (let b = 0; b < blobCount; b++) {
        const blob = blobs[b];
        const dx = x - blob.x;
        const dy = y - blob.y;
        const distSq = dx * dx + dy * dy;
        if (distSq > blobMaxDistSq[b]) continue;
        const r = blob.baseRadius;
        const field = (r * r) / (distSq + 1);
        sum += field;
        if (field > 0.01) {
          weightedBand += blob.freqBand * field;
          totalWeight += field;
        }
      }
      const idx = (py * sw + px) * 4;
      if (sum > threshold) {
        const band = totalWeight > 0 ? weightedBand / totalWeight : 0;
        const bandNorm = band / 128;
        const coreIntensity = Math.min(1, (sum - threshold) * 2);
        const edgeGlow = 1 - coreIntensity;
        const brightnessMul = 0.3 + coreIntensity * 0.7;
        const r = (lerp(colors.primary[0], colors.secondary[0], bandNorm) * brightnessMul) | 0;
        const g = (lerp(colors.primary[1], colors.secondary[1], bandNorm) * brightnessMul) | 0;
        const b = (lerp(colors.primary[2], colors.secondary[2], bandNorm) * brightnessMul) | 0;
        const accentMix = edgeGlow * energy * 0.6;
        sd[idx] = Math.min(255, (r + colors.accent[0] * accentMix) | 0);
        sd[idx + 1] = Math.min(255, (g + colors.accent[1] * accentMix) | 0);
        sd[idx + 2] = Math.min(255, (b + colors.accent[2] * accentMix) | 0);
        sd[idx + 3] = Math.min(255, (180 + coreIntensity * 75) | 0);
      } else if (sum > thresholdLow) {
        const glowIntensity = (sum - thresholdLow) / glowRange;
        sd[idx] = (colors.accent[0] * glowIntensity * 0.4) | 0;
        sd[idx + 1] = (colors.accent[1] * glowIntensity * 0.4) | 0;
        sd[idx + 2] = (colors.accent[2] * glowIntensity * 0.4) | 0;
        sd[idx + 3] = (glowIntensity * 60) | 0;
      } else sd[idx] = sd[idx + 1] = sd[idx + 2] = sd[idx + 3] = 0;
    }
  }
  try {
    offCtx.putImageData(_imgData, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(_offscreen, 0, 0, sw, sh, 0, 0, w, h);
  } catch {
    /* skip frame on canvas error */
  }
}
function FerrofluidRenderer({
  frequencyDataRef,
  className = '',
  blobCount = 12,
  colorPrimary = '#1a1a2e',
  colorSecondary = '#16213e',
  colorAccent = '#0f3460',
  sensitivity = 1.0,
  demo = false,
}: FerrofluidRendererProps) {
  const blobsRef = useRef<Blob[]>([]);
  const timeRef = useRef(0);
  const sizeRef = useRef({ w: 0, h: 0 });
  const mkColors = () => ({
    primary: hexToRgb(colorPrimary),
    secondary: hexToRgb(colorSecondary),
    accent: hexToRgb(colorAccent),
  });
  const colors = useRef<ReturnType<typeof mkColors>>(null!);
  if (!colors.current) colors.current = mkColors();
  useEffect(() => {
    colors.current = mkColors();
  }, [colorPrimary, colorSecondary, colorAccent]);
  const canvasRef = useCanvasLoop(
    frequencyDataRef,
    (ctx, w, h, freqData) => {
      if (
        blobsRef.current.length !== blobCount ||
        sizeRef.current.w !== w ||
        sizeRef.current.h !== h
      ) {
        blobsRef.current = createBlobs(blobCount, w, h);
        sizeRef.current = { w, h };
      }
      timeRef.current += 0.016;
      const t = timeRef.current;
      const blobs = blobsRef.current;
      const cx = w / 2;
      const cy = h / 2;
      let energy = 0;
      const frequencyData = freqData;
      if (frequencyData) {
        let sum = 0;
        for (let i = 0; i < frequencyData.length; i++) sum += frequencyData[i];
        energy = (sum / frequencyData.length / 255) * sensitivity;
      } else if (demo) energy = 0.3 + Math.sin(t * 0.5) * 0.2;
      const minWH = Math.min(w, h);
      for (let i = 0; i < blobs.length; i++) {
        const blob = blobs[i];
        const angle = blob.phase + t * blob.speed * 0.5;
        const bandIdx = Math.min(blob.freqBand, frequencyData ? frequencyData.length - 1 : 127);
        const orbitRadius = minWH * (0.1 + energy * 0.25);
        blob.targetX = cx + Math.cos(angle) * orbitRadius;
        blob.targetY = cy + Math.sin(angle * 0.7) * orbitRadius * 0.8;
        let bandVal: number;
        if (frequencyData) {
          bandVal = frequencyData[bandIdx] / 255;
          const displacement = bandVal * minWH * 0.15 * sensitivity;
          const dispAngle = angle + Math.PI * 0.5;
          blob.targetX += Math.cos(dispAngle) * displacement;
          blob.targetY += Math.sin(dispAngle) * displacement;
        } else if (demo) {
          bandVal = 0.4 + Math.sin(t * 3 + i * 0.8) * 0.3;
          const demoDisp = Math.sin(t * 2 + i) * minWH * 0.08;
          blob.targetX += Math.cos(angle * 1.3) * demoDisp;
          blob.targetY += Math.sin(angle * 1.7) * demoDisp;
        } else bandVal = 0.3;
        blob.vx += (blob.targetX - blob.x) * 0.08;
        blob.vy += (blob.targetY - blob.y) * 0.08;
        blob.vx *= 0.85;
        blob.vy *= 0.85;
        blob.x += blob.vx;
        blob.y += blob.vy;
        blob.baseRadius =
          minWH * (0.04 + blob.sizeFactor * 0.01) + bandVal * minWH * 0.06 * sensitivity;
      }
      ctx.clearRect(0, 0, w, h);
      drawMetaballs(ctx, blobs, w, h, colors.current, energy);
    },
    0.5,
  );
  return (
    <div className={`relative ${className}`}>
      {' '}
      <canvas ref={canvasRef} className="size-full" style={_IMAGE_RENDER_STYLE} />{' '}
      {/* SVG filter for smoothing the metaballs */}{' '}
      <svg className="absolute w-0 h-0" aria-hidden="true">
        <defs>
          {' '}
          <filter id="ferrofluid-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />{' '}
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />{' '}
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}
type NowPlayingBarProps = {
  station: Station | null;
  track: NowPlayingTrack | null;
  status: PlaybackStatus;
  volume: number;
  muted: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  icyBitrate?: string | null;
  onTogglePlay: () => void;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleEq: () => void;
  onToggleTheater?: () => void;
  onToggleFav?: () => void;
  onFavSong?: () => void;
  isFavorite?: boolean;
  songLiked?: boolean;
  eqPresetActive?: boolean;
  showEq: boolean;
  theaterMode?: boolean;
  compact?: boolean;
  sleepTimerMin?: number | null;
  onCycleSleepTimer?: () => void;
  streamQuality?: StreamQuality;
};
const SAFE_AREA_STYLE: React.CSSProperties = {
  paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
};
function _NowPlayingBar({
  station,
  track,
  status,
  volume,
  muted,
  frequencyDataRef,
  icyBitrate,
  onTogglePlay,
  onSetVolume,
  onToggleMute,
  onToggleEq,
  onToggleTheater,
  onToggleFav,
  onFavSong,
  isFavorite,
  songLiked,
  eqPresetActive,
  showEq,
  theaterMode,
  compact,
  sleepTimerMin,
  onCycleSleepTimer,
  streamQuality,
}: NowPlayingBarProps) {
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const [imgError, setImgError] = useState(false);
  const coverUrlForReset = track?.artworkUrl ?? station?.favicon;
  const [prevBarCoverUrl, setPrevBarCoverUrl] = useState(coverUrlForReset);
  if (coverUrlForReset !== prevBarCoverUrl) {
    setPrevBarCoverUrl(coverUrlForReset);
    setImgError(false);
  }
  const coverUrl = track?.artworkUrl ?? station?.favicon;
  const showFallback = !coverUrl || imgError;
  const statusAnnouncement = useMemo(() => {
    if (!station) return 'No station selected';
    const trackInfo = track?.title
      ? track.artist
        ? `${track.artist}, ${track.title}`
        : track.title
      : station.name;
    if (isLoading) return `Loading ${trackInfo}`;
    if (isPlaying) return `Now playing: ${trackInfo}`;
    if (status === 'error') return `Playback error: ${station.name}`;
    return `Paused: ${trackInfo}`;
  }, [station, track, isPlaying, isLoading, status]);
  const [firstTag, compactTags] = useMemo(() => {
    const t = station?.tags;
    if (!t) return ['', ''];
    const i1 = t.indexOf(',');
    if (i1 < 0) return [t, t];
    const first = t.slice(0, i1);
    const i2 = t.indexOf(',', i1 + 1);
    return [first, i2 < 0 ? `${first} · ${t.slice(i1 + 1)}` : `${first} · ${t.slice(i1 + 1, i2)}`];
  }, [station?.tags]);
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      onSetVolume(v);
      if (muted && v > 0) onToggleMute();
    },
    [muted, onSetVolume, onToggleMute],
  );
  if (compact) {
    return (
      <div
        className="relative flex items-center justify-between gap-3 pr-4 pt-2 pb-2 min-h-20 shrink-0 safe-bottom safe-x"
        style={SAFE_AREA_STYLE}
      >
        {' '}
        {/* Play/Pause — 48px touch target */}{' '}
        <button
          onClick={onTogglePlay}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-12 h-12 flex-center-row rounded-full bg-surface-3 hover:bg-surface-5 text-white transition-colors disabled:opacity-30 shrink-0 active:scale-95"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} className="ml-0.5" />
          )}
        </button>{' '}
        {/* Track info + LIVE indicator */}{' '}
        <div className="flex-1 min-w-0">
          {' '}
          {station ? (
            <>
              <p className="text-[13px] font-medium text-white truncate leading-tight">
                {' '}
                {track?.title || station.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {' '}
                {isPlaying && (
                  <>
                    <span className="dot-1.5 bg-red-500 animate-pulse shrink-0" />{' '}
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-red-500 shrink-0">
                      {' '}
                      LIVE
                    </span>
                  </>
                )}{' '}
                <span className="text-[12px] text-secondary truncate">
                  {track?.artist || compactTags || ''}
                </span>
              </div>{' '}
            </>
          ) : (
            <p className="text-[13px] text-dim">No station selected</p>
          )}
        </div>{' '}
        {/* Action buttons — 44px touch targets */}{' '}
        <div className="flex items-center gap-0.5 shrink-0">
          {' '}
          {station && !theaterMode && (
            <button
              onClick={onToggleTheater}
              className="w-10 h-10 flex-center-row rounded-xl text-white/45 hover:text-white/60 transition-colors active:scale-95"
              title="Theater"
              aria-label="Theater mode"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>{' '}
        {/* Fill iPhone safe-area inset below the bar without adding layout height */}{' '}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-full glass-blur"
          style={_SAFE_AREA_BOTTOM_STYLE}
        />
      </div>
    );
  }
  return (
    <div className="flex-row-3 px-4 min-h-18 glass-blur border-t border-border-default shrink-0 safe-bottom safe-x">
      {' '}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>{' '}
      {/* Station info */}{' '}
      <div className="flex-row-2.5 min-w-40">
        {' '}
        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-surface-2 flex-center-row">
          {' '}
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              {' '}
              <span className="text-white text-[11px] font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {' '}
                {station ? (
                  stationInitials(station.name) || <RadioIcon size={14} className="text-white/60" />
                ) : (
                  <RadioIcon size={14} className="text-white/60" />
                )}
              </span>
            </div>
          ) : (
            <UiImage
              src={coverUrl}
              alt=""
              className="object-cover"
              sizes="36px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>{' '}
        {/* TODO replace upper img with next image */}{' '}
        <div className="min-w-0">
          {' '}
          <p className="text-[12px] font-medium text-white truncate">
            {station?.name || 'Not Playing'}
          </p>{' '}
          <p className="text-[12px] text-secondary truncate">
            {' '}
            {track?.title
              ? track.artist
                ? `${track.artist} — ${track.title}`
                : track.title
              : firstTag}
          </p>{' '}
          {track?.album && <p className="text-[12px] text-dim truncate">{track.album}</p>}
        </div>{' '}
        {icyBitrate && (
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono text-white/50 shrink-0 self-center">
            {' '}
            {icyBitrate}kbps
          </span>
        )}{' '}
        {streamQuality && isPlaying && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 self-center ${streamQuality === 'good' ? 'bg-green-500' : streamQuality === 'fair' ? 'bg-yellow-500' : streamQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'}`}
            title={`Stream: ${streamQuality}`}
            aria-label={`Stream quality: ${streamQuality}`}
          />
        )}
      </div>{' '}
      {/* Controls */}{' '}
      <div className="flex-row-0.5">
        <button
          onClick={onTogglePlay}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          className="w-10 h-10 flex-center-row rounded-full bg-surface-3 hover:bg-surface-5 text-white transition-colors disabled:opacity-30"
        >
          {isLoading ? (
            <div className="icon-md border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} className="ml-0.5" />
          )}
        </button>
      </div>{' '}
      {/* LIVE indicator + mini ferrofluid */}{' '}
      <div className="flex-1 flex-row-2 min-w-0 relative">
        {' '}
        {station && isPlaying && (
          <>
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none opacity-40">
              {' '}
              <ErrorBoundary fallback={null}>
                <FerrofluidRenderer
                  frequencyDataRef={frequencyDataRef}
                  className="size-full"
                  blobCount={6}
                  colorPrimary="#1a1a2e"
                  colorSecondary="#16213e"
                  colorAccent="#0f3460"
                  sensitivity={1.0}
                  demo
                />
              </ErrorBoundary>
            </div>
            <div className="flex-row-1.5 relative z-10">
              {' '}
              <span className="dot-2 bg-red-500 animate-pulse" />{' '}
              <span className="text-[11px] font-semibold tracking-wider uppercase text-red-500">
                LIVE
              </span>{' '}
              <AnimatedBars size="small" />
            </div>
          </>
        )}
      </div>{' '}
      {/* Toggles */}{' '}
      <div className="flex-row-1">
        {station && !theaterMode && (
          <button
            onClick={onToggleTheater}
            className="p-2.5 rounded-md transition-colors text-subtle hover:text-white/50"
            title="Theater Mode"
            aria-label="Theater mode"
          >
            <Maximize2 size={14} />
          </button>
        )}{' '}
        {onToggleFav && (
          <button
            onClick={onToggleFav}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={!!isFavorite}
            className={`p-2.5 rounded-md transition-colors ${isFavorite ? 'text-sys-orange' : 'text-subtle hover:text-white/50'}`}
            title="Favorita"
          >
            <Star size={14} className={isFavorite ? 'fill-sys-orange' : ''} />
          </button>
        )}{' '}
        {onFavSong && (
          <button
            onClick={onFavSong}
            aria-label={songLiked ? 'Unlike song' : 'Like song'}
            aria-pressed={!!songLiked}
            className={`p-2.5 rounded-md transition-colors ${songLiked ? 'text-pink-400' : 'text-subtle hover:text-white/50'}`}
            title="Me gusta canción"
          >
            <Heart size={14} className={songLiked ? 'fill-pink-400' : ''} />
          </button>
        )}{' '}
        {onCycleSleepTimer && (
          <button
            onClick={onCycleSleepTimer}
            className={`p-2.5 rounded-md transition-colors relative ${sleepTimerMin != null ? 'text-sys-orange' : 'text-subtle hover:text-white/50'}`}
            title={sleepTimerMin != null ? `Sleep in ${sleepTimerMin}m` : 'Sleep Timer'}
            aria-label={
              sleepTimerMin != null
                ? `Sleep timer: ${sleepTimerMin} minutes remaining`
                : 'Sleep Timer'
            }
          >
            {' '}
            <Clock size={14} />{' '}
            {sleepTimerMin != null && (
              <span className="absolute -top-1 -right-1 text-[11px] font-bold text-sys-orange leading-none">
                {' '}
                {sleepTimerMin}
              </span>
            )}
          </button>
        )}{' '}
        <button
          onClick={onToggleEq}
          aria-label="Toggle equalizer"
          className={`p-2.5 rounded-md transition-colors ${eqPresetActive ? 'text-sys-orange' : showEq ? 'text-sys-orange bg-surface-2' : 'text-subtle hover:text-white/50'}`}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>{' '}
      {/* Volume */}{' '}
      <div className="flex-row-1 w-24 min-w-0 shrink-0 overflow-hidden ml-2">
        <button
          onClick={onToggleMute}
          aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
          aria-pressed={muted || volume === 0}
          className="p-2 text-muted hover:text-white/60 transition-colors shrink-0"
        >
          {' '}
          {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
          className="flex-fill h-0.75 appearance-none bg-surface-3 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_3px_rgba(0,0,0,0.3)]"
        />
      </div>
    </div>
  );
}
const NowPlayingBar = React.memo(_NowPlayingBar);
interface ParallaxAlbumBackgroundProps {
  imageUrl: string | null;
  fallbackUrl?: string;
  blurClass?: string;
  overlayClass?: string;
  enableDrift?: boolean;
  showTopGlow?: boolean;
  children?: React.ReactNode;
}
function ParallaxAlbumBackground({
  imageUrl,
  fallbackUrl,
  blurClass = 'blur-2xl',
  overlayClass = 'bg-black/50',
  enableDrift = true,
  showTopGlow = true,
  children,
}: ParallaxAlbumBackgroundProps) {
  const [imgError, setImgError] = useState(false);
  const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
  if (imageUrl !== prevImageUrl) {
    setPrevImageUrl(imageUrl);
    setImgError(false);
  }
  const src = (!imgError && imageUrl) || fallbackUrl || null;
  return (
    <div className="absolute inset-0 overflow-hidden">
      {' '}
      {src && (
        <Image
          src={src}
          alt=""
          fill
          style={_OBJECT_COVER_STYLE}
          className={`${blurClass} ${enableDrift ? 'animate-ambient-drift scale-105' : 'scale-110'} transition-[filter] duration-1000`}
          onError={() => setImgError(true)}
          unoptimized={src.startsWith('http')}
        />
      )}{' '}
      {!src && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]" />
      )}{' '}
      <div className={`absolute inset-0 ${overlayClass} backdrop-blur-sm`} />{' '}
      {showTopGlow && (
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      )}{' '}
      {children}
    </div>
  );
}
type NowPlayingHeroProps = {
  station: Station;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null;
  icyBitrate?: string | null;
  onTheater?: () => void;
};
const NowPlayingHero = React.memo(function NowPlayingHero({
  station,
  track,
  isPlaying,
  artworkUrl,
  icyBitrate,
  onTheater,
}: NowPlayingHeroProps) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = artworkUrl ?? station.favicon;
  const [prevCoverUrl, setPrevCoverUrl] = useState(coverUrl);
  if (coverUrl !== prevCoverUrl) {
    setPrevCoverUrl(coverUrl);
    setImgError(false);
  }
  const showFallback = !coverUrl || imgError;
  const heroTags = useMemo(() => _tagsDisplay(station.tags), [station.tags]);
  return (
    <div className="relative flex flex-col px-5 py-4 bg-surface-1 bdr-b overflow-hidden">
      <ParallaxAlbumBackground
        imageUrl={artworkUrl ?? null}
        fallbackUrl={station.favicon || undefined}
        overlayClass="bg-black/60"
      />{' '}
      {onTheater && (
        <button
          onClick={onTheater}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-[11px] font-medium text-white/60 hover:text-white hover:bg-black/60 transition-all"
          title="Theater mode"
        >
          <Maximize2 size={12} /> Theater
        </button>
      )}{' '}
      <div className="relative z-10 flex-row-4 w-full">
        {' '}
        <div className="relative w-16 h-16 rounded-xl bg-surface-2 flex-center-row shrink-0 overflow-hidden">
          {' '}
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              {' '}
              <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {' '}
                {stationInitials(station.name) || <RadioIcon size={24} className="text-white/60" />}
              </span>
            </div>
          ) : (
            <UiImage
              src={coverUrl}
              alt=""
              className="object-cover"
              sizes="64px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="flex-fill pr-20">
          {' '}
          <h3 className="text-[15px] font-semibold text-white truncate">{station.name}</h3>{' '}
          {track?.title ? (
            <p className="text-[13px] text-secondary truncate mt-0.5">
              {' '}
              {track.artist ? `${track.artist} — ${track.title}` : track.title}
            </p>
          ) : (
            <p className="text-[12px] text-secondary truncate mt-0.5">{heroTags}</p>
          )}{' '}
          {track?.album && <p className="text-[12px] text-dim truncate">{track.album}</p>}{' '}
          {isPlaying && (
            <div className="flex-row-1.5 mt-1">
              <span className="dot-1.5 bg-sys-orange" />{' '}
              <span className="text-[11px] font-semibold tracking-wider uppercase text-sys-orange">
                LIVE
              </span>{' '}
              <AnimatedBars size="small" />{' '}
              {icyBitrate && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[11px] font-mono text-white/50 ml-1">
                  {' '}
                  {icyBitrate}kbps
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
const GLASS_STYLE: React.CSSProperties = {
  background: 'rgba(20, 22, 35, 0.75)',
  backdropFilter: 'blur(32px) saturate(1.6)',
  WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
  border: '1px solid rgba(255,255,255,0.12)',
  boxShadow: '0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
};
type GuideSection = { icon: React.ReactNode; title: string; content: string };
const GUIDE_SECTIONS: GuideSection[] = [
  {
    icon: <IoRadioOutline size={22} className="text-[#3478f6]" />,
    title: 'Listening to Radio',
    content:
      'Browse stations by genre, country or search. Tap any station card to start playing. The visualizer activates automatically with live audio-reactive effects.',
  },
  {
    icon: <IoSearchOutline size={22} className="text-cyan-400" />,
    title: 'Search & Discover',
    content:
      'Use the search bar to find stations by name, genre or location. Enable Discovery Mode (lightning icon) to auto-play random stations every 30 seconds.',
  },
  {
    icon: <IoHeartOutline size={22} className="text-pink-400" />,
    title: 'Favorites',
    content:
      'Tap the star to save stations. Tap the heart to save songs. Filter your favorite songs by artist — songs are grouped in stacks you can expand.',
  },
  {
    icon: <IoMusicalNotesOutline size={22} className="text-purple-400" />,
    title: 'Lyrics & Track Info',
    content:
      'Pulse detects the current song and fetches lyrics automatically. Tap on any song in history for detailed info including artist bio and album art.',
  },
  {
    icon: <IoColorPaletteOutline size={22} className="text-amber-400" />,
    title: 'Theater Mode',
    content:
      'Press T or tap the theater button to enter immersive mode. The Fibonacci spiral visualizer reacts to the music with a CRT retro effect overlay.',
  },
  {
    icon: <IoStatsChartOutline size={22} className="text-emerald-400" />,
    title: 'Your Statistics',
    content:
      'Pulse tracks your listening: time per station, most played songs, top artists and genres. Your home screen reorders sections based on what you listen to most.',
  },
  {
    icon: <IoTimerOutline size={22} className="text-orange-400" />,
    title: 'Sleep Timer',
    content:
      'Press Z or use the timer icon to cycle through sleep durations (15, 30, 60, 90 min). Pulse will automatically stop playback when the timer ends.',
  },
  {
    icon: <IoGlobeOutline size={22} className="text-sky-400" />,
    title: 'Keyboard Shortcuts',
    content:
      'Space: play/pause • ← →: skip station • ↑ ↓: volume • T: theater • E: equalizer • L: like song • S: star station • F: focus search • ?: show all shortcuts.',
  },
];
type UsageGuideProps = { onClose: () => void };
function _UsageGuide({ onClose }: UsageGuideProps) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  return (
    <motion.div
      initial={_MOTION_FADE_IN}
      animate={_MOTION_FADE_VISIBLE}
      exit={_MOTION_FADE_OUT}
      transition={_MOTION_T_02}
      className="absolute inset-0 z-50 flex flex-col"
    >
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />{' '}
      <motion.div
        initial={_MOTION_SLIDE_UP_INIT}
        animate={_MOTION_SLIDE_UP_VISIBLE}
        exit={_MOTION_SLIDE_UP_EXIT}
        transition={_MOTION_T_SPRING}
        className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
        style={GLASS_STYLE}
      >
        {' '}
        {/* Handle bar */}{' '}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>{' '}
        {/* Header */}{' '}
        <div className="flex items-center gap-3 px-5 pb-3">
          <button
            onClick={onClose}
            aria-label="Close guide"
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <IoChevronBack size={16} />
          </button>{' '}
          <h2 className="text-[17px] font-semibold text-white">How to use Pulse</h2>
        </div>{' '}
        <div className="border-t border-white/8" /> {/* Guide sections */}{' '}
        <div className="px-5 py-4 space-y-2">
          {' '}
          {GUIDE_SECTIONS.map((section, idx) => {
            const isExpanded = expandedIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.03]"
              >
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex-shrink-0">{section.icon}</div>{' '}
                  <span className="text-[14px] font-medium text-white/80 flex-1">
                    {section.title}
                  </span>
                  <motion.span
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={_MOTION_T_02}
                    className="text-white/45 text-[12px]"
                  >
                    ▶
                  </motion.span>
                </button>
                <AnimatePresence>
                  {' '}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={_MOTION_T_02}
                      className="overflow-hidden"
                    >
                      {' '}
                      <p className="px-4 pb-3 text-[13px] text-white/50 leading-relaxed pl-[52px]">
                        {section.content}
                      </p>{' '}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
        <div className="h-6" />
      </motion.div>
    </motion.div>
  );
}
const UsageGuide = React.memo(_UsageGuide);
function formatListenTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}
type StatsViewProps = {
  topStations: StationListenTime[];
  topSongs: SongPlayCount[];
  topArtists: ArtistPlayCount[];
  topGenres: GenrePlayCount[];
  totalListenMs: number;
};
const StatSection = React.memo(function StatSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {' '}
        {icon} <span className="text-[13px] font-semibold text-white/80">{title}</span>{' '}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
});
const BarRow = React.memo(function BarRow({
  label,
  value,
  maxValue,
  suffix,
}: {
  label: string;
  value: number;
  maxValue: number;
  suffix: string;
}) {
  const pct = maxValue > 0 ? Math.max(8, (value / maxValue) * 100) : 0;
  return (
    <div className="flex items-center gap-2 group">
      {' '}
      <span className="text-[12px] text-white/50 w-[100px] truncate shrink-0">{label}</span>{' '}
      <div className="flex-1 h-4 rounded-full bg-white/[0.04] overflow-hidden relative">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#3478f6]/60 to-[#3478f6]/30 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />{' '}
      </div>
      <span className="text-[12px] text-white/50 tabular-nums w-[50px] text-right shrink-0">
        {suffix}
      </span>
    </div>
  );
});
const StatsView = React.memo(function StatsView({
  topStations,
  topSongs,
  topArtists,
  topGenres,
  totalListenMs,
}: StatsViewProps) {
  const hasData = totalListenMs > 0 || topSongs.length > 0;
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        {' '}
        <IoTimeOutline size={40} className="text-white/35 mb-3" />{' '}
        <p className="text-[14px] text-white/55">No listening data yet</p>{' '}
        <p className="text-[12px] text-white/50 mt-1">Start playing stations to see your stats</p>
      </div>
    );
  }
  const maxStationTime = topStations[0]?.totalMs ?? 1;
  const maxSongCount = topSongs[0]?.count ?? 1;
  const maxArtistCount = topArtists[0]?.count ?? 1;
  const maxGenreCount = topGenres[0]?.count ?? 1;
  return (
    <div className="p-4 space-y-6">
      {' '}
      {/* Total listen time */}{' '}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/8">
        {' '}
        <IoTimeOutline size={20} className="text-[#3478f6]" />{' '}
        <div>
          <p className="text-[12px] text-white/50 uppercase tracking-wider">Total Listen Time</p>{' '}
          <p className="text-[18px] font-bold text-white tabular-nums">
            {formatListenTime(totalListenMs)}
          </p>
        </div>
      </div>{' '}
      {/* Top Stations */}{' '}
      {topStations.length > 0 && (
        <StatSection
          title="Top Stations"
          icon={<IoRadioOutline size={16} className="text-amber-400/70" />}
        >
          {' '}
          {topStations.slice(0, 5).map((s) => (
            <BarRow
              key={s.uuid}
              label={s.name}
              value={s.totalMs}
              maxValue={maxStationTime}
              suffix={formatListenTime(s.totalMs)}
            />
          ))}
        </StatSection>
      )}{' '}
      {/* Top Songs */}{' '}
      {topSongs.length > 0 && (
        <StatSection
          title="Most Played Songs"
          icon={<IoMusicalNotesOutline size={16} className="text-pink-400/70" />}
        >
          {' '}
          {topSongs.slice(0, 5).map((s) => (
            <BarRow
              key={`${s.title}|||${s.artist}`}
              label={`${s.artist} — ${s.title}`}
              value={s.count}
              maxValue={maxSongCount}
              suffix={`${s.count}×`}
            />
          ))}
        </StatSection>
      )}{' '}
      {/* Top Artists */}{' '}
      {topArtists.length > 0 && (
        <StatSection
          title="Top Artists"
          icon={<IoPersonOutline size={16} className="text-purple-400/70" />}
        >
          {' '}
          {topArtists.slice(0, 5).map((a) => (
            <BarRow
              key={a.name}
              label={a.name}
              value={a.count}
              maxValue={maxArtistCount}
              suffix={`${a.count}×`}
            />
          ))}
        </StatSection>
      )}{' '}
      {/* Top Genres */}{' '}
      {topGenres.length > 0 && (
        <StatSection
          title="Top Genres"
          icon={<IoDiscOutline size={16} className="text-emerald-400/70" />}
        >
          {' '}
          {topGenres.slice(0, 5).map((g) => (
            <BarRow
              key={g.genre}
              label={g.genre}
              value={g.count}
              maxValue={maxGenreCount}
              suffix={`${g.count}×`}
            />
          ))}
        </StatSection>
      )}
    </div>
  );
});
type MobileSettingsPanelProps = {
  onClose: () => void;
  eq: {
    bands: EqBand[];
    enabled: boolean;
    normalizerEnabled: boolean;
    stereoWidth: number;
    bassEnhance: number;
    compressorEnabled: boolean;
    compressorAmount: number;
    noiseReductionMode: NoiseReductionMode;
    customPresets: EqPreset[];
    setBandGain: (id: string, gain: number) => void;
    applyPreset: (gains: number[]) => void;
    toggleEnabled: () => void;
    toggleNormalizer: () => void;
    setStereoWidth: (w: number) => void;
    setBassEnhance: (v: number) => void;
    toggleCompressor: () => void;
    setCompressorAmount: (v: number) => void;
    setNoiseReductionMode: (mode: NoiseReductionMode) => void;
    saveCustomPreset: (name: string) => void;
    removeCustomPreset: (name: string) => void;
  };
  onPresetChange: (name: string | null) => void;
  statsData?: {
    topStations: StationListenTime[];
    topSongs: SongPlayCount[];
    topArtists: ArtistPlayCount[];
    topGenres: GenrePlayCount[];
    totalListenMs: number;
  };
  desktop?: boolean;
};
function MobileSettingsPanel({ onClose, eq, onPresetChange, statsData, desktop }: MobileSettingsPanelProps) {
  const { locale, setLocale, locales } = useLocale();
  const [showEq, setShowEq] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const handleSelectPreset = useCallback(
    (name: string, gains: number[]) => {
      setSelectedPreset(name);
      eq.applyPreset(gains);
      onPresetChange(name);
    },
    [eq, onPresetChange],
  );
  const handleSetGain = useCallback(
    (id: string, gain: number) => {
      setSelectedPreset(null);
      onPresetChange(null);
      eq.setBandGain(id, gain);
    },
    [eq, onPresetChange],
  );
  const handleSave = () => {
    const name = presetName.trim();
    if (name) {
      eq.saveCustomPreset(name);
      setPresetName('');
      setShowSaveInput(false);
    }
  };
  return (
    <motion.div
      initial={_MOTION_FADE_IN}
      animate={_MOTION_FADE_VISIBLE}
      exit={_MOTION_FADE_OUT}
      transition={_MOTION_T_02}
      className={desktop ? 'fixed inset-0 z-50 flex items-center justify-center' : 'absolute inset-0 z-50 flex flex-col'}
    >
      {' '}
      {/* Backdrop */} <div className={desktop ? 'fixed inset-0 bg-black/60' : 'absolute inset-0 bg-black/50'} onClick={onClose} />{' '}
      {/* Panel */}{' '}
      <motion.div
        initial={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_INIT}
        animate={desktop ? { opacity: 1, scale: 1 } : _MOTION_SLIDE_UP_VISIBLE}
        exit={desktop ? { opacity: 0, scale: 0.95 } : _MOTION_SLIDE_UP_EXIT}
        transition={desktop ? { duration: 0.2 } : _MOTION_T_SPRING}
        className={desktop ? 'relative w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-2xl' : 'absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom'}
        style={_GLASS_SETTINGS_STYLE}
        data-testid={desktop ? 'desktop-settings-modal' : 'mobile-settings-panel'}
      >
        {' '}
        {/* Handle bar — mobile only */}{' '}
        {!desktop && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>
        )}{' '}
        {/* Header */}{' '}
        <div className={`flex items-center justify-between px-5 pb-3 ${desktop ? 'pt-4' : ''}`}>
          {' '}
          <h2 className="text-[17px] font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-10 h-10 flex-center-row rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="border-t border-white/8" /> {/* Language section */}{' '}
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            {' '}
            <Languages size={16} className="text-white/60" />{' '}
            <span className="text-[14px] font-medium text-white/80">Language</span>
          </div>{' '}
          <div className="grid grid-cols-3 gap-2">
            {locales.map((item) => (
              <button
                key={item.code}
                onClick={() => setLocale(item.code as typeof locale)}
                className={`px-3 py-2 rounded-xl text-[13px] font-medium transition-colors ${locale === item.code ? 'bg-sys-orange/20 border border-sys-orange/50 text-sys-orange' : 'bg-white/5 border border-white/8 text-white/60 hover:text-white/80'}`}
              >
                {item.nativeName}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-white/8" /> {/* Equalizer section — fully inline */}{' '}
        <div className="px-5 py-4">
          {' '}
          <button
            onClick={() => setShowEq((s) => !s)}
            className="flex items-center justify-between w-full"
            aria-label="Toggle equalizer section"
            aria-expanded={showEq}
          >
            {' '}
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-white/60" />{' '}
              <span className="text-[14px] font-medium text-white/80">Equalizer</span>
            </div>{' '}
            <div className="flex items-center gap-2">
              {' '}
              <span
                className={`text-[12px] font-medium px-2 py-0.5 rounded-full ${eq.enabled ? 'bg-sys-orange/20 text-sys-orange' : 'bg-white/5 text-white/45'}`}
              >
                {eq.enabled ? 'ON' : 'OFF'}
              </span>{' '}
              {showEq ? (
                <ChevronUp size={14} className="text-white/45" />
              ) : (
                <ChevronDown size={14} className="text-white/45" />
              )}{' '}
            </div>
          </button>{' '}
          {showEq && (
            <div className="mt-4 space-y-4">
              {' '}
              {/* Power + Normalizer toggles */}{' '}
              <div className="flex items-center gap-2">
                {' '}
                <button
                  onClick={eq.toggleEnabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.enabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 text-white/45 border border-white/8'}`}
                >
                  {' '}
                  <Power size={12} /> {eq.enabled ? 'Enabled' : 'Disabled'}
                </button>{' '}
                <button
                  onClick={eq.toggleNormalizer}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${eq.normalizerEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 text-white/45 border border-white/8'}`}
                >
                  {' '}
                  NORM
                </button>
              </div>{' '}
              {/* Presets */}{' '}
              <div>
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Presets
                </span>{' '}
                <div className="flex flex-wrap gap-1.5">
                  {EQ_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handleSelectPreset(preset.name, preset.gains)}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 border border-white/8 text-white/50 hover:text-white/80'}`}
                    >
                      {' '}
                      {preset.name}
                    </button>
                  ))}{' '}
                  {eq.customPresets.map((preset) => (
                    <div key={`custom-${preset.name}`} className="flex">
                      {' '}
                      <button
                        onClick={() => handleSelectPreset(preset.name, preset.gains)}
                        className={`px-2.5 py-1.5 text-[11px] rounded-l-lg transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border-l border-t border-b border-sys-orange/40' : 'bg-sys-orange/10 text-sys-orange border-l border-t border-b border-white/8'}`}
                      >
                        {' '}
                        {preset.name}
                      </button>
                      <button
                        onClick={() => eq.removeCustomPreset(preset.name)}
                        aria-label={`Delete ${preset.name} preset`}
                        className="px-1.5 py-1.5 text-[11px] rounded-r-lg bg-white/5 border border-white/8 text-white/45 hover:text-red-400 transition-colors"
                      >
                        {' '}
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>{' '}
                {/* Save custom */}{' '}
                <div className="mt-2">
                  {showSaveInput ? (
                    <div className="flex items-center gap-1.5">
                      {' '}
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave();
                          if (e.key === 'Escape') setShowSaveInput(false);
                        }}
                        placeholder="Preset name…"
                        className="flex-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/8 text-white placeholder:text-white/50 outline-none focus:border-sys-orange/50"
                        autoFocus
                      />{' '}
                      <button
                        onClick={handleSave}
                        aria-label="Save preset"
                        className="p-2 rounded-lg bg-sys-orange/20 text-sys-orange"
                      >
                        <Save size={12} />
                      </button>{' '}
                      <button
                        onClick={() => setShowSaveInput(false)}
                        aria-label="Cancel"
                        className="p-2 rounded-lg bg-white/5 text-white/45"
                      >
                        <X size={12} />
                      </button>{' '}
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSaveInput(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg bg-white/5 border border-white/8 text-white/45 hover:text-white/60 transition-colors"
                    >
                      {' '}
                      <Plus size={10} /> Save Custom
                    </button>
                  )}
                </div>
              </div>{' '}
              {/* Band sliders — horizontal scroll */}{' '}
              <div>
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Bands
                </span>{' '}
                <div className="flex items-end justify-between gap-1.5 px-1">
                  {' '}
                  {eq.bands.map((band) => (
                    <div key={band.id} className="flex flex-col items-center gap-1">
                      {' '}
                      <span className="text-[12px] text-white/50 tabular-nums">
                        {band.gain > 0 ? `+${band.gain}` : band.gain}
                      </span>{' '}
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={band.gain}
                        onChange={(e) => handleSetGain(band.id, parseInt(e.target.value, 10))}
                        disabled={!eq.enabled}
                        aria-label={`${band.label} Hz gain`}
                        className="eq-slider h-20 appearance-none bg-transparent cursor-pointer disabled:opacity-30 [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-runnable-track]:w-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/10 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                      />{' '}
                      <span className="text-[12px] text-white/50">{band.label}</span>
                    </div>
                  ))}
                </div>
              </div>{' '}
              {/* Noise Reduction */}{' '}
              <div>
                {' '}
                <span className="text-[12px] text-white/50 uppercase tracking-wider mb-2 block">
                  Noise Reduction
                </span>{' '}
                <div className="flex gap-1.5">
                  {(['off', 'low', 'medium', 'high'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => eq.setNoiseReductionMode(mode)}
                      className={`flex-1 py-1.5 text-[11px] rounded-lg font-medium transition-colors ${eq.noiseReductionMode === mode ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-white/5 border border-white/8 text-white/50'}`}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </button>
                  ))}
                </div>
              </div>{' '}
              {/* Sliders: Width, Bass, Compressor */}{' '}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {' '}
                  <span className="text-[12px] text-white/50 w-10 shrink-0">Width</span>{' '}
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={5}
                    value={Math.round(eq.stereoWidth * 100)}
                    onChange={(e) => eq.setStereoWidth(parseInt(e.target.value, 10) / 100)}
                    aria-label="Stereo width"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.stereoWidth * 100)}%
                  </span>{' '}
                </div>
                <div className="flex items-center gap-3">
                  {' '}
                  <span className="text-[12px] text-white/50 w-10 shrink-0">Bass+</span>{' '}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(eq.bassEnhance * 100)}
                    onChange={(e) => eq.setBassEnhance(parseInt(e.target.value, 10) / 100)}
                    aria-label="Bass enhance"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.bassEnhance * 100)}%
                  </span>{' '}
                </div>
                <div className="flex items-center gap-3">
                  {' '}
                  <button
                    onClick={eq.toggleCompressor}
                    className={`text-[12px] w-10 shrink-0 text-left font-medium transition-colors ${eq.compressorEnabled ? 'text-sys-orange' : 'text-white/50'}`}
                  >
                    Comp
                  </button>{' '}
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(eq.compressorAmount * 100)}
                    onChange={(e) => eq.setCompressorAmount(parseInt(e.target.value, 10) / 100)}
                    disabled={!eq.compressorEnabled}
                    aria-label="Compressor amount"
                    className="flex-1 h-1 appearance-none bg-white/10 rounded-full cursor-pointer disabled:opacity-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange"
                  />{' '}
                  <span className="text-[12px] text-white/50 tabular-nums w-8 text-right">
                    {Math.round(eq.compressorAmount * 100)}%
                  </span>{' '}
                </div>
              </div>
            </div>
          )}
        </div>{' '}
        {/* Usage guide & Stats */} <div className="border-t border-white/8" />{' '}
        <div className="px-5 py-4 space-y-2">
          <button
            onClick={() => setShowGuide(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          >
            <IoHelpCircleOutline size={18} className="text-[#3478f6] flex-shrink-0" />{' '}
            <span className="text-[14px] font-medium text-white/70">How to use Pulse</span>
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors text-left"
          >
            <IoStatsChartOutline size={18} className="text-emerald-400 flex-shrink-0" />{' '}
            <span className="text-[14px] font-medium text-white/70">Your Statistics</span>
          </button>
        </div>{' '}
        {/* Bottom safe area padding */} <div className="h-6" />
      </motion.div>{' '}
      {/* Usage Guide overlay */}{' '}
      <AnimatePresence>
        {showGuide && <UsageGuide onClose={() => setShowGuide(false)} />}
      </AnimatePresence>{' '}
      {/* Stats overlay */}{' '}
      <AnimatePresence>
        {showStats && (
          <motion.div
            initial={_MOTION_FADE_IN}
            animate={_MOTION_FADE_VISIBLE}
            exit={_MOTION_FADE_OUT}
            transition={_MOTION_T_02}
            className="absolute inset-0 z-50 flex flex-col"
          >
            {' '}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowStats(false)}
            />{' '}
            <motion.div
              initial={_MOTION_SLIDE_UP_INIT}
              animate={_MOTION_SLIDE_UP_VISIBLE}
              exit={_MOTION_SLIDE_UP_EXIT}
              transition={_MOTION_T_SPRING}
              className="absolute bottom-0 inset-x-0 max-h-[85vh] overflow-y-auto rounded-t-2xl safe-bottom"
              style={_GLASS_PANEL_STYLE}
            >
              {' '}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>{' '}
              <div className="flex items-center gap-3 px-5 pb-3">
                <button
                  onClick={() => setShowStats(false)}
                  aria-label="Close statistics"
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
                <h2 className="text-[17px] font-semibold text-white">Your Statistics</h2>
              </div>{' '}
              <div className="border-t border-white/8" />{' '}
              {statsData && (
                <StatsView
                  topStations={statsData.topStations}
                  topSongs={statsData.topSongs}
                  topArtists={statsData.topArtists}
                  topGenres={statsData.topGenres}
                  totalListenMs={statsData.totalListenMs}
                />
              )}{' '}
              <div className="h-6" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
type FavoriteSongsViewProps = {
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onSelect?: (song: SongDetailData) => void;
};
type ContextMenuState = { x: number; y: number; songId: string } | null;
type FilterMode = 'none' | 'artist' | 'album';
const filterBtnClass = (active: boolean) =>
  `flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${active ? 'bg-[#3478f6]/20 text-[#3478f6] border border-[#3478f6]/30' : 'bg-white/5 text-white/45 border border-white/8 hover:text-white/60'}`;
function SongContextMenu({
  menu,
  onRemove,
  onClose,
}: {
  menu: ContextMenuState;
  onRemove: (id: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('pointerdown', onPointerDown, _EVT_CAPTURE_PASSIVE);
    window.addEventListener('scroll', onScroll, _EVT_CAPTURE_PASSIVE);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, _EVT_CAPTURE_PASSIVE);
      window.removeEventListener('scroll', onScroll, _EVT_CAPTURE_PASSIVE);
    };
  }, [menu, onClose]);
  if (!menu) return null;
  const menuW = 200;
  const menuH = 48;
  const x = Math.min(menu.x, window.innerWidth - menuW - 8);
  const y = Math.min(menu.y, window.innerHeight - menuH - 8);
  return createPortal(
    <div
      ref={ref}
      style={{ top: y, left: x, width: menuW }}
      className="fixed z-[200] py-1 rounded-xl bg-surface-3 border border-border-default shadow-2xl backdrop-blur-sm"
    >
      {' '}
      <button
        onClick={() => {
          onRemove(menu.songId);
          onClose();
        }}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 text-[12px] text-red-400 hover:bg-red-400/10 transition-colors rounded-lg"
      >
        <Trash2 size={13} /> Borrar de favoritos
      </button>{' '}
    </div>,
    document.body,
  );
}
function GroupStack({
  label,
  icon: Icon,
  songs,
  onRemove,
  onSelect,
  onContextMenu,
}: {
  label: string;
  icon: React.ElementType;
  songs: FavoriteSong[];
  onRemove: (id: string) => void;
  onSelect?: (song: SongDetailData) => void;
  onContextMenu: (e: React.MouseEvent, songId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const VISIBLE_COUNT = 3;
  const hasMore = songs.length > VISIBLE_COUNT;
  const visibleSongs = useMemo(
    () => (expanded ? songs : songs.slice(0, VISIBLE_COUNT)),
    [expanded, songs],
  );
  return (
    <div className="mb-6">
      {' '}
      {/* Group header */}{' '}
      <button
        onClick={() => hasMore && setExpanded((e) => !e)}
        className={`flex items-center gap-2 mb-3 group ${hasMore ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {' '}
        <Icon size={14} className="text-white/50" />{' '}
        <span className="text-[14px] font-semibold text-white/80">{label}</span>{' '}
        <span className="text-[11px] text-white/50 bg-white/[0.06] px-2 py-0.5 rounded-full">
          {songs.length}
        </span>{' '}
        {hasMore && (
          <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={_MOTION_T_02}>
            {' '}
            <ChevronDown size={14} className="text-white/45" />
          </motion.span>
        )}
      </button>{' '}
      {/* Stacked/expanded cards */}{' '}
      {!expanded && hasMore ? (
        <div
          className="relative cursor-pointer"
          onClick={() => setExpanded(true)}
          role="button"
          tabIndex={0}
          aria-label={`Expand ${label} songs`}
          style={{ height: `${250 + (Math.min(songs.length, VISIBLE_COUNT) - 1) * 16}px` }}
        >
          {' '}
          {songs.slice(0, VISIBLE_COUNT).map((song, i) => (
            <div
              key={song.id}
              className="absolute left-0 right-0 transition-all duration-300"
              style={{
                top: `${i * 16}px`,
                zIndex: VISIBLE_COUNT - i,
                transform: `scale(${1 - i * 0.03})`,
                opacity: 1 - i * 0.15,
                maxWidth: '200px',
              }}
            >
              <div className="bg-surface-2 rounded-xl border border-border-default overflow-hidden">
                {' '}
                <div className="w-full aspect-square bg-surface-3 relative">
                  {song.artworkUrl ? (
                    <UiImage
                      src={song.artworkUrl}
                      alt=""
                      className="object-cover"
                      sizes="200px"
                      loading="lazy"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center">
                      <Music size={28} className="text-dim" />
                    </div>
                  )}
                </div>{' '}
                <div className="p-2.5">
                  <p className="text-[12px] font-medium text-white line-clamp-1">{song.title}</p>{' '}
                  <p className="text-[11px] text-secondary line-clamp-1">{song.artist}</p>
                </div>
              </div>
            </div>
          ))}{' '}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center"
            style={_MAX_WIDTH_200_STYLE}
          >
            {' '}
            <span className="text-[11px] text-[#3478f6] font-medium bg-[#3478f6]/10 px-3 py-1 rounded-full border border-[#3478f6]/20">
              {' '}
              +{songs.length - VISIBLE_COUNT} more
            </span>
          </div>
        </div>
      ) : (
        <AnimatePresence>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {' '}
            {visibleSongs.map((song, i) => (
              <div
                key={song.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onContextMenu(e, song.id);
                }}
              >
                <SongCard
                  item={song}
                  onRemove={() => onRemove(song.id)}
                  onSelect={onSelect}
                  delay={i}
                  heart={null}
                  hideRemove
                />
              </div>
            ))}
          </div>
        </AnimatePresence>
      )}{' '}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-3 flex items-center gap-1 text-[11px] text-white/50 hover:text-white/60 transition-colors"
        >
          {' '}
          <ChevronDown size={12} className="rotate-180" /> Collapse
        </button>
      )}
    </div>
  );
}
function FavoriteSongsView({ songs, onRemove, onClear, onSelect }: FavoriteSongsViewProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('none');
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const handleContextMenu = useCallback((e: React.MouseEvent, songId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, songId });
  }, []);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const artistGroups = useMemo(() => {
    const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const artist = primaryArtist(song.artist);
      let arr = groups.get(artist);
      if (!arr) { arr = []; groups.set(artist, arr); }
      arr.push(song);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  const albumGroups = useMemo(() => {
    const groups = new Map<string, FavoriteSong[]>();
    for (const song of songs) {
      const album = song.album || 'Unknown Album';
      let arr = groups.get(album);
      if (!arr) { arr = []; groups.set(album, arr); }
      arr.push(song);
    }
    return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [songs]);
  if (songs.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Heart size={40} className="text-dim mb-3" />{' '}
        <p className="text-[14px] text-secondary">No favorite songs yet</p>{' '}
        <p className="text-[12px] text-dim mt-1">Tap the heart icon to save songs you love</p>
      </div>
    );
  }
  const toggleFilter = (mode: FilterMode) =>
    setFilterMode((prev) => (prev === mode ? 'none' : mode));
  return (
    <div className="p-4">
      <SongContextMenu menu={contextMenu} onRemove={onRemove} onClose={closeContextMenu} />{' '}
      <div className="flex items-center justify-between mb-4">
        {' '}
        <div className="flex items-center gap-2">
          <p className="text-[12px] text-dim">{songs.length} songs</p> {/* By Artist */}{' '}
          <button
            onClick={() => toggleFilter('artist')}
            className={filterBtnClass(filterMode === 'artist')}
          >
            {' '}
            <Users size={10} /> By Artist{' '}
            {filterMode === 'artist' && (
              <X
                size={8}
                className="ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMode('none');
                }}
              />
            )}{' '}
          </button>{' '}
          {/* By Album */}{' '}
          <button
            onClick={() => toggleFilter('album')}
            className={filterBtnClass(filterMode === 'album')}
          >
            {' '}
            <Disc3 size={10} /> By Album{' '}
            {filterMode === 'album' && (
              <X
                size={8}
                className="ml-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterMode('none');
                }}
              />
            )}{' '}
          </button>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors"
        >
          {' '}
          <Trash2 size={11} /> Clear all
        </button>
      </div>{' '}
      {filterMode === 'artist' ? (
        <div>
          {' '}
          {artistGroups.map(([artistName, artistSongs]) => (
            <GroupStack
              key={artistName}
              label={artistName}
              icon={Users}
              songs={artistSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : filterMode === 'album' ? (
        <div>
          {' '}
          {albumGroups.map(([albumName, albumSongs]) => (
            <GroupStack
              key={albumName}
              label={albumName}
              icon={Disc3}
              songs={albumSongs}
              onRemove={onRemove}
              onSelect={onSelect}
              onContextMenu={handleContextMenu}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
          {' '}
          {songs.map((song, i) => (
            <div
              key={song.id}
              onContextMenu={(e) => {
                e.preventDefault();
                handleContextMenu(e, song.id);
              }}
            >
              <SongCard
                item={song}
                onRemove={() => onRemove(song.id)}
                onSelect={onSelect}
                delay={i}
                heart={null}
                hideRemove
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
type HistoryGridViewProps = {
  history: HistoryEntry[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onToggleFavSong?: (entry: HistoryEntry) => void;
  isSongFavorite?: (title: string, artist: string) => boolean;
  onSelect?: (song: SongDetailData) => void;
};
const HistoryGridView = React.memo(function HistoryGridView({
  history,
  onRemove,
  onClear,
  onToggleFavSong,
  isSongFavorite,
  onSelect,
}: HistoryGridViewProps) {
  if (history.length === 0) {
    return (
      <div className="flex-center-col py-20 px-4">
        <Clock size={40} className="text-dim mb-3" />{' '}
        <p className="text-[14px] text-secondary">No listening history yet</p>{' '}
        <p className="text-[12px] text-dim mt-1">Songs you listen to will appear here</p>
      </div>
    );
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        {' '}
        <p className="text-[12px] text-dim">{history.length} songs</p>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-dim hover:text-red-400 transition-colors"
        >
          {' '}
          <Trash2 size={11} /> Clear all
        </button>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
        {' '}
        {history.map((entry, i) => (
          <SongCard
            key={entry.id}
            item={entry}
            delay={i}
            onRemove={() => onRemove(entry.id)}
            onSelect={onSelect}
            heart={
              onToggleFavSong
                ? {
                    filled: !!isSongFavorite?.(entry.title, entry.artist),
                    onClick: () => onToggleFavSong(entry),
                    label: isSongFavorite?.(entry.title, entry.artist)
                      ? 'Unlike song'
                      : 'Like song',
                  }
                : null
            }
          />
        ))}
      </div>
    </div>
  );
});
const ONBOARDING_KEY = 'radio-onboarding-done';
type OnboardingStep = { icon: React.ReactNode; title: string; description: string };
const STEPS: OnboardingStep[] = [
  {
    icon: <IoRadioOutline size={48} className="text-[#3478f6]" />,
    title: 'Welcome to Pulse',
    description:
      'Your free internet radio experience. Discover thousands of stations, genres and artists from around the world.',
  },
  {
    icon: <IoMusicalNotesOutline size={48} className="text-pink-400" />,
    title: 'Live Radio & Lyrics',
    description:
      'Listen to live radio with real-time song detection, synchronized lyrics, and detailed track information.',
  },
  {
    icon: <IoHeartOutline size={48} className="text-red-400" />,
    title: 'Favorites & History',
    description:
      'Save your favorite stations and songs. Browse your listening history and rediscover music you loved.',
  },
  {
    icon: <IoColorPaletteOutline size={48} className="text-purple-400" />,
    title: 'Immersive Visualizer',
    description:
      'Enjoy a reactive audio visualizer with CRT effects. Customize the sound with the built-in equalizer.',
  },
  {
    icon: <IoStatsChartOutline size={48} className="text-emerald-400" />,
    title: 'Your Stats',
    description:
      'Track your listening habits — most played artists, genres, stations and songs. Your home adapts to your taste.',
  },
];
const _TOTAL_STEPS = STEPS.length + 1;
const _STEP_INDICES = Array.from({ length: _TOTAL_STEPS }, (_, i) => i);
function PWAStep() {
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(
    null,
  );
  const [isIos] = useState(
    () => typeof navigator !== 'undefined' && _IOS_UA_RE.test(navigator.userAgent),
  );
  const [isStandalone] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches,
  );
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
      } catch {
        /* user dismissed install prompt */
      }
      setDeferredPrompt(null);
    }
  };
  if (isStandalone) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        {' '}
        <IoCheckmarkCircleOutline size={48} className="text-emerald-400" />{' '}
        <h2 className="text-xl font-bold text-white">Already Installed!</h2>{' '}
        <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
          {' '}
          You&apos;re using Pulse as an app. Enjoy the full experience!
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {' '}
      <IoPhonePortraitOutline size={48} className="text-[#3478f6]" />{' '}
      <h2 className="text-xl font-bold text-white">Install as App</h2>{' '}
      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
        {' '}
        Install Pulse on your device for the best experience — instant access, offline support, and
        no browser bars.
      </p>{' '}
      {deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="mt-2 px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
        >
          Install Now
        </button>
      ) : isIos ? (
        <div className="mt-2 p-3 rounded-xl bg-white/5 border border-white/10">
          {' '}
          <div className="flex items-center gap-2 text-[13px] text-white/70">
            {' '}
            <IoShareOutline size={18} className="text-[#3478f6] flex-shrink-0" />{' '}
            <span>
              Tap <strong className="text-white">Share</strong> →{' '}
              <strong className="text-white">Add to Home Screen</strong>
            </span>{' '}
          </div>
        </div>
      ) : (
        <p className="text-[12px] text-white/50 mt-1">
          {' '}
          Use Chrome or Edge for the install option, or add this page to your home screen.
        </p>
      )}
    </div>
  );
}
function _OnboardingModal() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const done = loadFromStorage<boolean>(ONBOARDING_KEY, false);
    if (!done) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);
  const handleClose = useCallback(() => {
    setShow(false);
    saveToStorage(ONBOARDING_KEY, true);
  }, []);
  if (!show) return null;
  const currentStep = step < STEPS.length ? STEPS[step] : null;
  const isPWAStep = step >= STEPS.length;
  const isLast = step === _TOTAL_STEPS - 1;
  return (
    <AnimatePresence>
      {' '}
      {show && (
        <motion.div
          initial={_MOTION_FADE_IN}
          animate={_MOTION_FADE_VISIBLE}
          exit={_MOTION_FADE_OUT}
          className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        >
          {' '}
          {/* Backdrop */} <div className="absolute inset-0 bg-black/70" onClick={handleClose} />{' '}
          {/* Modal */}{' '}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-sm rounded-3xl overflow-hidden"
            style={GLASS_STYLE}
          >
            {' '}
            {/* Content */}{' '}
            <div className="p-8">
              <AnimatePresence mode="wait">
                {' '}
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={_MOTION_T_02}
                  className="flex flex-col items-center gap-4 text-center min-h-[200px] justify-center"
                >
                  {' '}
                  {currentStep ? (
                    <>
                      <div className="p-4 rounded-2xl bg-white/[0.06]">{currentStep.icon}</div>{' '}
                      <h2 className="text-xl font-bold text-white">{currentStep.title}</h2>{' '}
                      <p className="text-[14px] text-white/60 leading-relaxed max-w-xs">
                        {currentStep.description}
                      </p>
                    </>
                  ) : isPWAStep ? (
                    <PWAStep />
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>{' '}
            {/* Progress dots + navigation */}{' '}
            <div className="px-8 pb-6 flex flex-col gap-4">
              {' '}
              {/* Dots */}{' '}
              <div className="flex justify-center gap-2">
                {' '}
                {_STEP_INDICES.map((i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`rounded-full transition-all ${i === step ? 'w-6 h-2 bg-[#3478f6]' : 'w-2 h-2 bg-white/20 hover:bg-white/30'}`}
                    aria-label={`Step ${i + 1}`}
                  />
                ))}
              </div>{' '}
              {/* Buttons */}{' '}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={step > 0 ? () => setStep((s) => s - 1) : handleClose}
                  className={`px-5 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${step > 0 ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-white/45 hover:text-white/60'}`}
                >
                  {step > 0 ? 'Back' : 'Skip'}
                </button>
                <button
                  onClick={() => (step < _TOTAL_STEPS - 1 ? setStep((s) => s + 1) : handleClose())}
                  className="px-6 py-2.5 rounded-xl bg-[#3478f6] text-white font-semibold text-[14px] hover:bg-[#2968d9] transition-colors active:scale-95"
                >
                  {isLast ? "Let's Go!" : 'Next'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
const OnboardingModal = React.memo(_OnboardingModal);
function useParallaxBg(genre?: string, audioAmplitude = 0) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const audioOffsetRef = useRef({ x: 0, y: 0 });
  const tickRafRef = useRef(0);
  const audioAmplitudeRef = useRef(audioAmplitude);
  useEffect(() => {
    audioAmplitudeRef.current = audioAmplitude;
  }, [audioAmplitude]);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = ((e.clientX - cx) / rect.width) * 20;
      const y = ((e.clientY - cy) / rect.height) * 20;
      pointerOffsetRef.current = { x, y };
    });
  }, []);
  const lastPublishedRef = useRef({ x: 0, y: 0 });
  useEffect(() => {
    const tick = () => {
      const a = Math.max(0, Math.min(1, audioAmplitudeRef.current));
      audioOffsetRef.current = { x: a * 2.2, y: -a * 6.5 };
      const nextX = pointerOffsetRef.current.x + audioOffsetRef.current.x;
      const nextY = pointerOffsetRef.current.y + audioOffsetRef.current.y;
      if (
        Math.abs(nextX - lastPublishedRef.current.x) >= 0.05 ||
        Math.abs(nextY - lastPublishedRef.current.y) >= 0.05
      ) {
        lastPublishedRef.current = { x: nextX, y: nextY };
        setOffset(lastPublishedRef.current);
      }
      tickRafRef.current = requestAnimationFrame(tick);
    };
    tickRafRef.current = requestAnimationFrame(tick);
    window.addEventListener('mousemove', handleMouseMove, _EVT_PASSIVE);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(tickRafRef.current);
    };
  }, [handleMouseMove]);
  const gradient = genre
    ? GENRE_GRADIENTS[genre.toLowerCase()] || GENRE_GRADIENTS.default
    : GENRE_GRADIENTS.default;
  return { offset, containerRef, gradient };
}
type ParallaxBackgroundProps = {
  faviconUrl?: string;
  genre?: string;
  audioAmplitude?: number;
  landingMode?: boolean;
};
const BF_STYLE: React.CSSProperties = {
  WebkitBackfaceVisibility: 'hidden',
  backfaceVisibility: 'hidden',
};
const BLUR_STYLE: React.CSSProperties = {
  filter: 'blur(64px)',
  WebkitFilter: 'blur(64px)',
  transform: 'translate3d(0,0,0)',
  WebkitTransform: 'translate3d(0,0,0)',
};
const RADIAL_OVERLAY: React.CSSProperties = {
  background: 'radial-gradient(140% 120% at 50% 40%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.55) 100%)',
};
function _ParallaxBackground({
  faviconUrl,
  genre,
  audioAmplitude = 0,
  landingMode = false,
}: ParallaxBackgroundProps) {
  const { offset, containerRef, gradient } = useParallaxBg(genre, audioAmplitude);
  const baseGradient = landingMode
    ? 'radial-gradient(120% 100% at 50% 8%, rgba(112,112,112,0.18) 0%, rgba(44,44,44,0.16) 35%, rgba(24,24,24,0.92) 100%)'
    : gradient;
  return (
    <div ref={containerRef} className="abs-fill overflow-hidden pointer-events-none">
      <div
        className="absolute inset-[-40px] transition-transform duration-300 ease-out"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          WebkitTransform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          background: baseGradient,
          opacity: landingMode ? 0.85 : 0.15,
          willChange: 'transform',
        }}
      />{' '}
      {landingMode && <div className="absolute inset-0" style={RADIAL_OVERLAY} />}{' '}
      {faviconUrl && (
        <div
          className="absolute inset-[-40px] transition-transform duration-300 ease-out"
          style={{
            transform: `translate3d(${offset.x * 1.5}px, ${offset.y * 1.5}px, 0)`,
            WebkitTransform: `translate3d(${offset.x * 1.5}px, ${offset.y * 1.5}px, 0)`,
            willChange: 'transform',
          }}
        >
          {' '}
          {/* Separate blur layer for iOS GPU compositing */}{' '}
          <div className="absolute inset-0" style={BF_STYLE}>
            <UiImage
              src={faviconUrl}
              alt=""
              className={`object-cover ${landingMode ? 'opacity-10' : 'opacity-20'}`}
              sizes="100vw"
              style={BLUR_STYLE}
            />
          </div>
        </div>
      )}{' '}
    </div>
  );
}
const ParallaxBackground = React.memo(_ParallaxBackground);
function _LanguageSelector() {
  const { locale, setLocale, locales } = useLocale();
  return (
    <label className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/[0.06] text-[12px] text-dim">
      {' '}
      <Languages size={12} className="text-white/70" /> <span className="sr-only">Language</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as typeof locale)}
        className="bg-transparent text-white outline-none cursor-pointer"
        aria-label="Language selector"
        data-language-selector
      >
        {' '}
        {locales.map((item) => (
          <option key={item.code} value={item.code} className="bg-[#0a0f1a] text-white">
            {item.nativeName}
          </option>
        ))}
      </select>
    </label>
  );
}
const LanguageSelector = React.memo(_LanguageSelector);
type EqPanelProps = {
  bands: EqBand[];
  enabled: boolean;
  normalizerEnabled: boolean;
  stereoWidth: number;
  bassEnhance: number;
  compressorEnabled: boolean;
  compressorAmount: number;
  noiseReductionMode: NoiseReductionMode;
  customPresets?: EqPreset[];
  onSetGain: (id: string, gain: number) => void;
  onApplyPreset: (gains: number[]) => void;
  onToggleEnabled: () => void;
  onToggleNormalizer: () => void;
  onSetStereoWidth: (w: number) => void;
  onSetBassEnhance: (v: number) => void;
  onToggleCompressor: () => void;
  onSetCompressorAmount: (v: number) => void;
  onSetNoiseReductionMode: (mode: NoiseReductionMode) => void;
  onClose: () => void;
  onSaveCustomPreset?: (name: string) => void;
  onRemoveCustomPreset?: (name: string) => void;
  onPresetChange?: (name: string | null) => void;
};
const EqPanel = React.memo(function EqPanel({
  bands,
  enabled,
  normalizerEnabled,
  stereoWidth,
  bassEnhance,
  compressorEnabled,
  compressorAmount,
  noiseReductionMode,
  customPresets = [],
  onSetGain,
  onApplyPreset,
  onToggleEnabled,
  onToggleNormalizer,
  onSetStereoWidth,
  onSetBassEnhance,
  onToggleCompressor,
  onSetCompressorAmount,
  onSetNoiseReductionMode,
  onClose,
  onSaveCustomPreset,
  onRemoveCustomPreset,
  onPresetChange,
}: EqPanelProps) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const handleSelectPreset = (name: string, gains: number[]) => {
    setSelectedPreset(name);
    onApplyPreset(gains);
    onPresetChange?.(name);
  };
  const handleSetGain = (id: string, gain: number) => {
    setSelectedPreset(null);
    onPresetChange?.(null);
    onSetGain(id, gain);
  };
  const handleSave = () => {
    const name = presetName.trim();
    if (name && onSaveCustomPreset) {
      onSaveCustomPreset(name);
      setPresetName('');
      setShowSaveInput(false);
    }
  };
  return (
    <div className="absolute bottom-16 right-4 w-72 bg-sys-surface/95 backdrop-blur-xl border border-border-strong rounded-xl p-4 shadow-2xl z-50">
      {' '}
      {/* Header */}{' '}
      <div className="flex-between mb-4">
        {' '}
        <div className="flex-row-2">
          <span className="text-[13px] font-semibold text-white">Equalizer</span>{' '}
          <button
            onClick={onToggleEnabled}
            aria-label={enabled ? 'Disable equalizer' : 'Enable equalizer'}
            className={`p-2 rounded transition-colors ${enabled ? 'text-sys-orange' : 'text-dim'}`}
          >
            <Power size={13} />
          </button>{' '}
          <button
            onClick={onToggleNormalizer}
            aria-label={
              normalizerEnabled ? 'Disable loudness normalizer' : 'Enable loudness normalizer'
            }
            title="Loudness Normalizer"
            className={`px-1.5 py-0.5 text-[11px] font-semibold rounded transition-colors ${normalizerEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-surface-2 text-dim hover:text-secondary'}`}
          >
            NORM
          </button>
        </div>{' '}
        <button onClick={onClose} aria-label="Close equalizer" className="p-2 text-subtle-hover">
          <X size={14} />
        </button>
      </div>{' '}
      {/* Presets */}{' '}
      <div className="flex-wrap-1.5 mb-2">
        {EQ_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handleSelectPreset(preset.name, preset.gains)}
            className={`px-2 py-1 text-[11px] rounded-md transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-surface-2 hover:bg-surface-4 text-secondary hover:text-white'}`}
          >
            {' '}
            {preset.name}
          </button>
        ))}{' '}
        {customPresets.map((preset) => (
          <div key={`custom-${preset.name}`} className="flex-row-0.5">
            {' '}
            <button
              onClick={() => handleSelectPreset(preset.name, preset.gains)}
              className={`px-2 py-1 text-[11px] rounded-l-md transition-colors ${selectedPreset === preset.name ? 'bg-sys-orange/20 text-sys-orange border-l border-t border-b border-sys-orange/40' : 'bg-sys-orange/10 hover:bg-sys-orange/20 text-sys-orange hover:text-white'}`}
            >
              {' '}
              {preset.name}
            </button>{' '}
            {onRemoveCustomPreset && (
              <button
                onClick={() => onRemoveCustomPreset(preset.name)}
                aria-label={`Delete ${preset.name} preset`}
                className="px-1 py-1 text-[11px] rounded-r-md bg-sys-orange/10 hover:bg-red-500/30 text-dim hover:text-red-400 transition-colors"
              >
                {' '}
                <X size={8} />
              </button>
            )}
          </div>
        ))}
      </div>{' '}
      {/* Save custom preset */}{' '}
      {onSaveCustomPreset && (
        <div className="mb-4">
          {' '}
          {showSaveInput ? (
            <div className="flex-row-1.5">
              {' '}
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setShowSaveInput(false);
                }}
                placeholder="Preset name…"
                aria-label="Preset name"
                className="flex-1 px-2 py-1 text-[11px] rounded-md bg-surface-2 border border-border-strong text-white placeholder:text-white/50 outline-none focus:border-sys-orange/50"
                autoFocus
              />{' '}
              <button
                onClick={handleSave}
                aria-label="Save preset"
                className="p-2 rounded-md bg-sys-orange/20 text-sys-orange hover:bg-sys-orange/30 transition-colors"
              >
                <Save size={10} />
              </button>{' '}
              <button
                onClick={() => setShowSaveInput(false)}
                aria-label="Cancel"
                className="p-2 rounded-md bg-surface-2 text-subtle-hover"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSaveInput(true)}
              className="flex-row-1 px-2 py-1 text-[11px] rounded-md bg-surface-1 hover:bg-surface-3 text-muted hover:text-white/60 transition-colors"
            >
              {' '}
              <Plus size={10} /> Save Custom
            </button>
          )}
        </div>
      )}{' '}
      {/* Band sliders */}{' '}
      <div className="flex items-end justify-between gap-2">
        {' '}
        {bands.map((band) => (
          <div key={band.id} className="col-center gap-1">
            {' '}
            <span className="text-[11px] text-dim tabular-nums">
              {band.gain > 0 ? `+${band.gain}` : band.gain}
            </span>{' '}
            <input
              type="range"
              min={-12}
              max={12}
              step={1}
              value={band.gain}
              onChange={(e) => handleSetGain(band.id, parseInt(e.target.value, 10))}
              disabled={!enabled}
              aria-label={`${band.label} gain`}
              className="eq-slider h-24 appearance-none bg-transparent cursor-pointer disabled:opacity-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sys-orange/60 focus-visible:outline-offset-2 rounded [writing-mode:vertical-lr] [direction:rtl] [&::-webkit-slider-runnable-track]:w-[3px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-surface-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
            />{' '}
            <span className="text-[11px] text-secondary">{band.label}</span>
          </div>
        ))}
      </div>{' '}
      {/* Stereo width */}{' '}
      <div className="mt-3 pt-3 border-t border-white/10">
        {' '}
        <div className="mb-2">
          <div className="text-[11px] text-secondary mb-1">Noise Reduction</div>{' '}
          <div className="flex-wrap-1.5">
            {(['off', 'low', 'medium', 'high'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onSetNoiseReductionMode(mode)}
                className={`px-2 py-1 text-[11px] rounded-md transition-colors ${noiseReductionMode === mode ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/40' : 'bg-surface-2 hover:bg-surface-4 text-secondary hover:text-white'}`}
                aria-label={`Noise reduction ${mode}`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>{' '}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-secondary shrink-0 w-12">Width</span>{' '}
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={Math.round(stereoWidth * 100)}
            onChange={(e) => onSetStereoWidth(parseInt(e.target.value, 10) / 100)}
            aria-label="Stereo width"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />{' '}
          <span className="text-[11px] text-dim tabular-nums w-8 text-right">
            {Math.round(stereoWidth * 100)}%
          </span>{' '}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {' '}
          <span className="text-[11px] text-secondary shrink-0 w-12">Bass+</span>{' '}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(bassEnhance * 100)}
            onChange={(e) => onSetBassEnhance(parseInt(e.target.value, 10) / 100)}
            aria-label="Bass enhance"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />{' '}
          <span className="text-[11px] text-dim tabular-nums w-8 text-right">
            {Math.round(bassEnhance * 100)}%
          </span>{' '}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {' '}
          <button
            onClick={onToggleCompressor}
            aria-label={compressorEnabled ? 'Disable compressor' : 'Enable compressor'}
            title="Multiband Compressor"
            className={`text-[11px] font-semibold shrink-0 w-12 text-left transition-colors ${compressorEnabled ? 'text-sys-orange' : 'text-secondary'}`}
          >
            Comp
          </button>{' '}
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(compressorAmount * 100)}
            onChange={(e) => onSetCompressorAmount(parseInt(e.target.value, 10) / 100)}
            disabled={!compressorEnabled}
            aria-label="Compressor amount"
            className="flex-1 h-1 appearance-none bg-surface-4 rounded-full cursor-pointer disabled:opacity-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-sys-orange [&::-webkit-slider-thumb]:shadow-[0_0_4px_rgba(255,159,10,0.4)]"
          />{' '}
          <span className="text-[11px] text-dim tabular-nums w-8 text-right">
            {Math.round(compressorAmount * 100)}%
          </span>{' '}
        </div>{' '}
      </div>
    </div>
  );
});
const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause' },
  { key: '←', desc: 'Previous station' },
  { key: '→', desc: 'Next station' },
  { key: '↑', desc: 'Volume up' },
  { key: '↓', desc: 'Volume down' },
  { key: 'M', desc: 'Mute / Unmute' },
  { key: 'F', desc: 'Focus search' },
  { key: 'S', desc: 'Favorite station' },
  { key: 'L', desc: 'Like current song' },
  { key: 'R', desc: 'Toggle realtime lyrics sync' },
  { key: 'T', desc: 'Theater mode' },
  { key: 'E', desc: 'Equalizer' },
  { key: 'Z', desc: 'Cycle sleep timer' },
  { key: 'Esc', desc: 'Close panel / exit theater' },
  { key: '?', desc: 'Toggle this help' },
];
interface Props {
  onClose: () => void;
}
const KeyboardShortcutsHelp = React.memo(function KeyboardShortcutsHelp({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={onClose}
    >
      <div
        className="bg-surface-2 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          {' '}
          <h2 className="text-[15px] font-semibold text-white">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-surface-3 transition-colors text-secondary"
            aria-label="Close shortcuts help"
          >
            <X size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          {' '}
          {SHORTCUTS.map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between py-1 px-1">
              {' '}
              <span className="text-[13px] text-secondary">{desc}</span>{' '}
              <kbd className="text-[12px] font-mono bg-surface-3 text-white px-2 py-0.5 rounded-md min-w-[2rem] text-center">
                {' '}
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
type UseAudioAnalyserOptions = { fftSize?: number; smoothingTimeConstant?: number };
interface UseAudioAnalyserReturn {
  connectAudio: (audio: HTMLAudioElement) => void;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */ frequencyDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Stable ref whose .current is updated in-place every frame — zero allocations */ waveDataRef: React.RefObject<Uint8Array<ArrayBuffer> | null>;
  /** Audio metering: peak level 0-1, RMS level 0-1 (updated every frame) */ meterRef: React.RefObject<{
    peak: number;
    rms: number;
  }>;
  isActive: boolean;
  disconnect: () => void;
}
const _EMPTY_ANALYSER_OPTS: UseAudioAnalyserOptions = {};
function useAudioAnalyser(opts: UseAudioAnalyserOptions = _EMPTY_ANALYSER_OPTS): UseAudioAnalyserReturn {
  const { fftSize = 256, smoothingTimeConstant = 0.8 } = opts;
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const connectedRef = useRef<HTMLAudioElement | null>(null);
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const waveDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const meterRef = useRef<{ peak: number; rms: number }>({ peak: 0, rms: 0 });
  const [isActive, setIsActive] = useState(false);
  const connectAudio = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedRef.current === audio && analyserRef.current) return;
      cancelAnimationFrame(rafRef.current);
      try {
        const { ctx, source } = getOrCreateAudioSource(audio);
        connectedRef.current = audio;
        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = smoothingTimeConstant;
          source.connect(analyser);
          analyserRef.current = analyser;
        } else source.connect(analyserRef.current);
        const binCount = analyserRef.current.frequencyBinCount;
        const fftLen = analyserRef.current.fftSize;
        if (!frequencyDataRef.current || frequencyDataRef.current.length !== binCount)
          frequencyDataRef.current = new Uint8Array(binCount);
        if (!waveDataRef.current || waveDataRef.current.length !== fftLen)
          waveDataRef.current = new Uint8Array(fftLen);
        setIsActive(true);
        const tick = () => {
          if (!document.hidden) {
            if (frequencyDataRef.current)
              analyserRef.current?.getByteFrequencyData(frequencyDataRef.current);
            if (waveDataRef.current) {
              analyserRef.current?.getByteTimeDomainData(waveDataRef.current);
              const buf = waveDataRef.current;
              let sumSqInt = 0;
              let maxAbsInt = 0;
              for (let i = 0; i < buf.length; i++) {
                const s = buf[i] - 128;
                sumSqInt += s * s;
                const a = s < 0 ? -s : s;
                if (a > maxAbsInt) maxAbsInt = a;
              }
              meterRef.current.peak = maxAbsInt / 128;
              meterRef.current.rms = Math.sqrt(sumSqInt / buf.length) / 128;
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        cancelAnimationFrame(rafRef.current);
        setIsActive(false);
        frequencyDataRef.current = null;
        waveDataRef.current = null;
      }
    },
    [fftSize, smoothingTimeConstant],
  );
  const disconnect = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    connectedRef.current = null;
    setIsActive(false);
    frequencyDataRef.current = null;
    waveDataRef.current = null;
  }, []);
  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );
  return { connectAudio, frequencyDataRef, waveDataRef, meterRef, isActive, disconnect };
}
const NR_PRESETS: Record<
  NoiseReductionMode,
  {
    hpfHz: number;
    gateThreshold: number;
    gateRatio: number;
    deEsserCenterHz: number;
    deEsserGain: number;
  }
> = {
  off: { hpfHz: 20, gateThreshold: -90, gateRatio: 1.0, deEsserCenterHz: 6000, deEsserGain: 0 },
  low: { hpfHz: 35, gateThreshold: -55, gateRatio: 1.5, deEsserCenterHz: 5500, deEsserGain: -1.5 },
  medium: { hpfHz: 35, gateThreshold: -48, gateRatio: 2.0, deEsserCenterHz: 6000, deEsserGain: -3 },
  high: { hpfHz: 35, gateThreshold: -42, gateRatio: 3.0, deEsserCenterHz: 6500, deEsserGain: -4.5 },
};
const QUALITY_DEFAULTS_MIGRATION_KEY = 'radio-quality-defaults-v2-applied';
function ensureQualityMigration(): void {
  if (loadFromStorage<boolean>(QUALITY_DEFAULTS_MIGRATION_KEY, false)) return;
  saveToStorage(STORAGE_KEYS.NOISE_REDUCTION_MODE, 'low');
  saveToStorage(STORAGE_KEYS.NORMALIZER_ENABLED, true);
  saveToStorage(QUALITY_DEFAULTS_MIGRATION_KEY, true);
}
function getDefaultNoiseReductionMode(): NoiseReductionMode {
  ensureQualityMigration();
  return loadFromStorage<NoiseReductionMode>(STORAGE_KEYS.NOISE_REDUCTION_MODE, 'low');
}
function getDefaultNormalizerEnabled(): boolean {
  ensureQualityMigration();
  return loadFromStorage<boolean>(STORAGE_KEYS.NORMALIZER_ENABLED, true);
}
function useEqualizer() {
  const [bands, setBands] = useState<EqBand[]>(() => {
    const defaults = EQ_BANDS.map((b) => ({ ...b }));
    const saved = loadFromStorage<EqBand[]>(STORAGE_KEYS.EQ_BANDS, defaults);
    return saved.length === defaults.length ? saved : defaults;
  });
  const [enabled, setEnabled] = useState(true);
  const [customPresets, setCustomPresets] = useState<EqPreset[]>(() =>
    loadFromStorage<EqPreset[]>(STORAGE_KEYS.CUSTOM_EQ_PRESETS, []),
  );
  const [normalizerEnabled, setNormalizerEnabled] = useState(getDefaultNormalizerEnabled);
  const [stereoWidth, setStereoWidthState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.STEREO_WIDTH, 1.0),
  );
  const [bassEnhance, setBassEnhanceState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.BASS_ENHANCE, 0),
  );
  const [compressorEnabled, setCompressorEnabled] = useState(() =>
    loadFromStorage<boolean>(STORAGE_KEYS.COMPRESSOR_ENABLED, false),
  );
  const [compressorAmount, setCompressorAmountState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.COMPRESSOR_AMOUNT, 0.5),
  );
  const [noiseReductionMode, setNoiseReductionModeState] = useState<NoiseReductionMode>(
    getDefaultNoiseReductionMode,
  );
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const limiterRef = useRef<DynamicsCompressorNode | null>(null);
  const normalizerRef = useRef<DynamicsCompressorNode | null>(null);
  const normGainRef = useRef<GainNode | null>(null);
  const splitterRef = useRef<ChannelSplitterNode | null>(null);
  const mergerRef = useRef<ChannelMergerNode | null>(null);
  const outputGainRef = useRef<GainNode | null>(null);
  const outputVolumeRef = useRef(1);
  const outputMutedRef = useRef(false);
  const directGainLRef = useRef<GainNode | null>(null);
  const directGainRRef = useRef<GainNode | null>(null);
  const crossGainLRef = useRef<GainNode | null>(null);
  const crossGainRRef = useRef<GainNode | null>(null);
  const bassLpRef = useRef<BiquadFilterNode | null>(null);
  const bassShaperRef = useRef<WaveShaperNode | null>(null);
  const bassHpRef = useRef<BiquadFilterNode | null>(null);
  const bassMixRef = useRef<GainNode | null>(null);
  const nrHighpassRef = useRef<BiquadFilterNode | null>(null);
  const nrGateRef = useRef<DynamicsCompressorNode | null>(null);
  const nrDeEsserRef = useRef<BiquadFilterNode | null>(null);
  const nrDeEssGainRef = useRef<GainNode | null>(null);
  const mbLowLpRef = useRef<BiquadFilterNode | null>(null);
  const mbLowCompRef = useRef<DynamicsCompressorNode | null>(null);
  const mbMidBpLpRef = useRef<BiquadFilterNode | null>(null);
  const mbMidBpHpRef = useRef<BiquadFilterNode | null>(null);
  const mbMidCompRef = useRef<DynamicsCompressorNode | null>(null);
  const mbHighHpRef = useRef<BiquadFilterNode | null>(null);
  const mbHighCompRef = useRef<DynamicsCompressorNode | null>(null);
  const mbDryGainRef = useRef<GainNode | null>(null);
  const mbWetGainRef = useRef<GainNode | null>(null);
  const mbMergeRef = useRef<GainNode | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);
  const graphNodeRefs: React.MutableRefObject<AudioNode | null>[] = [
    normalizerRef,
    normGainRef,
    limiterRef,
    splitterRef,
    mergerRef,
    outputGainRef,
    directGainLRef,
    directGainRRef,
    crossGainLRef,
    crossGainRRef,
    mbLowLpRef,
    mbLowCompRef,
    mbMidBpLpRef,
    mbMidBpHpRef,
    mbMidCompRef,
    mbHighHpRef,
    mbHighCompRef,
    mbDryGainRef,
    mbWetGainRef,
    mbMergeRef,
    nrHighpassRef,
    nrGateRef,
    nrDeEsserRef,
    nrDeEssGainRef,
    bassLpRef,
    bassShaperRef,
    bassHpRef,
    bassMixRef,
  ];
  function teardownGraph(includeSource: boolean) {
    try {
      sourceRef.current?.disconnect();
      filtersRef.current.forEach((f) => f.disconnect());
      for (const ref of graphNodeRefs) ref.current?.disconnect();
    } catch {
      /* ok */
    }
    filtersRef.current = [];
    for (const ref of graphNodeRefs) ref.current = null;
    if (includeSource) {
      sourceRef.current = null;
      connectedAudioRef.current = null;
    }
  }
  const RAMP_TIME = 0.02;
  const applyNoiseReductionPreset = useCallback((mode: NoiseReductionMode) => {
    const preset = NR_PRESETS[mode];
    const ctx = ctxRef.current;
    const t = ctx?.currentTime ?? 0;
    if (nrHighpassRef.current)
      nrHighpassRef.current.frequency.setTargetAtTime(preset.hpfHz, t, RAMP_TIME);
    if (nrGateRef.current) {
      nrGateRef.current.threshold.setTargetAtTime(preset.gateThreshold, t, RAMP_TIME);
      nrGateRef.current.ratio.setTargetAtTime(preset.gateRatio, t, RAMP_TIME);
    }
    if (nrDeEsserRef.current) {
      nrDeEsserRef.current.frequency.setTargetAtTime(preset.deEsserCenterHz, t, RAMP_TIME);
      nrDeEsserRef.current.gain.setTargetAtTime(preset.deEsserGain, t, RAMP_TIME);
    }
  }, []);
  const setOutputVolume = useCallback((volume: number, muted: boolean) => {
    const clamped = Math.max(0, Math.min(1, volume));
    outputVolumeRef.current = clamped;
    outputMutedRef.current = muted;
    const next = muted ? 0 : clamped;
    const ctx = ctxRef.current;
    if (outputGainRef.current && ctx) {
      outputGainRef.current.gain.setTargetAtTime(next, ctx.currentTime, RAMP_TIME);
    } else if (outputGainRef.current) outputGainRef.current.gain.value = next;
  }, []);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.EQ_BANDS, bands);
    const ctx = ctxRef.current;
    filtersRef.current.forEach((f, i) => {
      if (bands[i]) {
        const target = enabled ? bands[i].gain : 0;
        if (ctx) f.gain.setTargetAtTime(target, ctx.currentTime, RAMP_TIME);
        else f.gain.value = target;
      }
    });
  }, [bands, enabled]);
  const connectSource = useCallback(
    (audio: HTMLAudioElement) => {
      if (connectedAudioRef.current === audio && ctxRef.current) return;
      if (connectedAudioRef.current) teardownGraph(false);
      try {
        const { ctx, source } = getOrCreateAudioSource(audio);
        ctxRef.current = ctx;
        sourceRef.current = source;
        connectedAudioRef.current = audio;
        const nrPreset = NR_PRESETS[noiseReductionMode];
        const nyquist = ctx.sampleRate / 2;
        const filters = bands.map((band) => {
          const filter = ctx.createBiquadFilter();
          filter.type = band.type;
          filter.frequency.value = Math.max(20, Math.min(nyquist - 1, band.frequency));
          filter.gain.value = enabled ? band.gain : 0;
          if (band.type === 'peaking') filter.Q.value = 1.0;
          return filter;
        });
        const normalizer = ctx.createDynamicsCompressor();
        normalizer.threshold.value = -24;
        normalizer.knee.value = 12;
        normalizer.ratio.value = 3;
        normalizer.attack.value = 0.01;
        normalizer.release.value = 0.25;
        normalizerRef.current = normalizer;
        const normGain = ctx.createGain();
        normGain.gain.value = normalizerEnabled ? 1.6 : 1.0;
        normGainRef.current = normGain;
        const nrHighpass = ctx.createBiquadFilter();
        nrHighpass.type = 'highpass';
        nrHighpass.frequency.value = nrPreset.hpfHz;
        nrHighpass.Q.value = 0.7;
        const nrGate = ctx.createDynamicsCompressor();
        nrGate.threshold.value = nrPreset.gateThreshold;
        nrGate.knee.value = 4;
        nrGate.ratio.value = nrPreset.gateRatio;
        nrGate.attack.value = 0.01;
        nrGate.release.value = 0.18;
        const nrDeEsser = ctx.createBiquadFilter();
        nrDeEsser.type = 'peaking';
        nrDeEsser.frequency.value = nrPreset.deEsserCenterHz;
        nrDeEsser.Q.value = 3.2;
        nrDeEsser.gain.value = nrPreset.deEsserGain;
        const nrDeEssGain = ctx.createGain();
        nrDeEssGain.gain.value = 1;
        nrHighpassRef.current = nrHighpass;
        nrGateRef.current = nrGate;
        nrDeEsserRef.current = nrDeEsser;
        nrDeEssGainRef.current = nrDeEssGain;
        if (normalizerEnabled) {
          source.connect(normalizer);
          normalizer.connect(normGain);
          normGain.connect(nrHighpass);
        } else source.connect(nrHighpass);
        nrHighpass.connect(nrGate);
        nrGate.connect(nrDeEsser);
        nrDeEsser.connect(nrDeEssGain);
        nrDeEssGain.connect(filters[0]);
        for (let i = 0; i < filters.length - 1; i++) {
          filters[i].connect(filters[i + 1]);
        }
        const bassLp = ctx.createBiquadFilter();
        bassLp.type = 'lowpass';
        bassLp.frequency.value = 200;
        bassLp.Q.value = 0.7;
        const bassShaper = ctx.createWaveShaper();
        bassShaper.curve = _BASS_CURVE;
        bassShaper.oversample = '2x';
        const bassHp = ctx.createBiquadFilter();
        bassHp.type = 'highpass';
        bassHp.frequency.value = 80;
        bassHp.Q.value = 0.7;
        const bassMix = ctx.createGain();
        bassMix.gain.value = bassEnhance;
        filters[filters.length - 1].connect(bassLp);
        bassLp.connect(bassShaper);
        bassShaper.connect(bassHp);
        bassHp.connect(bassMix);
        bassLpRef.current = bassLp;
        bassShaperRef.current = bassShaper;
        bassHpRef.current = bassHp;
        bassMixRef.current = bassMix;
        const mbMerge = ctx.createGain();
        mbMerge.gain.value = 1.0;
        const wetAmount = compressorEnabled ? compressorAmount : 0;
        const dryAmount = compressorEnabled ? 1 - compressorAmount * 0.5 : 1;
        const mbDry = ctx.createGain();
        mbDry.gain.value = dryAmount;
        const mbWet = ctx.createGain();
        mbWet.gain.value = wetAmount;
        const mbLowLp = ctx.createBiquadFilter();
        mbLowLp.type = 'lowpass';
        mbLowLp.frequency.value = 200;
        mbLowLp.Q.value = 0.7;
        const mbLowComp = ctx.createDynamicsCompressor();
        mbLowComp.threshold.value = -18;
        mbLowComp.knee.value = 10;
        mbLowComp.ratio.value = 3;
        mbLowComp.attack.value = 0.02;
        mbLowComp.release.value = 0.3;
        const mbMidBpHp = ctx.createBiquadFilter();
        mbMidBpHp.type = 'highpass';
        mbMidBpHp.frequency.value = 200;
        mbMidBpHp.Q.value = 0.7;
        const mbMidBpLp = ctx.createBiquadFilter();
        mbMidBpLp.type = 'lowpass';
        mbMidBpLp.frequency.value = 3000;
        mbMidBpLp.Q.value = 0.7;
        const mbMidComp = ctx.createDynamicsCompressor();
        mbMidComp.threshold.value = -20;
        mbMidComp.knee.value = 8;
        mbMidComp.ratio.value = 4;
        mbMidComp.attack.value = 0.005;
        mbMidComp.release.value = 0.15;
        const mbHighHp = ctx.createBiquadFilter();
        mbHighHp.type = 'highpass';
        mbHighHp.frequency.value = 3000;
        mbHighHp.Q.value = 0.7;
        const mbHighComp = ctx.createDynamicsCompressor();
        mbHighComp.threshold.value = -16;
        mbHighComp.knee.value = 6;
        mbHighComp.ratio.value = 3;
        mbHighComp.attack.value = 0.002;
        mbHighComp.release.value = 0.1;
        const lastFilter = filters[filters.length - 1];
        lastFilter.connect(mbDry);
        mbDry.connect(mbMerge);
        lastFilter.connect(mbLowLp);
        mbLowLp.connect(mbLowComp);
        mbLowComp.connect(mbWet);
        lastFilter.connect(mbMidBpHp);
        mbMidBpHp.connect(mbMidBpLp);
        mbMidBpLp.connect(mbMidComp);
        mbMidComp.connect(mbWet);
        lastFilter.connect(mbHighHp);
        mbHighHp.connect(mbHighComp);
        mbHighComp.connect(mbWet);
        mbWet.connect(mbMerge);
        bassMix.connect(mbMerge);
        mbLowLpRef.current = mbLowLp;
        mbLowCompRef.current = mbLowComp;
        mbMidBpLpRef.current = mbMidBpLp;
        mbMidBpHpRef.current = mbMidBpHp;
        mbMidCompRef.current = mbMidComp;
        mbHighHpRef.current = mbHighHp;
        mbHighCompRef.current = mbHighComp;
        mbDryGainRef.current = mbDry;
        mbWetGainRef.current = mbWet;
        mbMergeRef.current = mbMerge;
        const limiter = ctx.createDynamicsCompressor();
        limiter.threshold.value = -3;
        limiter.knee.value = 6;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.1;
        mbMerge.connect(limiter);
        limiterRef.current = limiter;
        const w = stereoWidth;
        const direct = (1 + w) / 2;
        const cross = (1 - w) / 2;
        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);
        const outputGain = ctx.createGain();
        const directL = ctx.createGain();
        const directR = ctx.createGain();
        const crossL = ctx.createGain();
        const crossR = ctx.createGain();
        directL.gain.value = direct;
        directR.gain.value = direct;
        crossL.gain.value = cross;
        crossR.gain.value = cross;
        limiter.connect(splitter);
        splitter.connect(directL, 0);
        splitter.connect(crossR, 1);
        directL.connect(merger, 0, 0);
        crossR.connect(merger, 0, 0);
        splitter.connect(directR, 1);
        splitter.connect(crossL, 0);
        directR.connect(merger, 0, 1);
        crossL.connect(merger, 0, 1);
        merger.connect(outputGain);
        outputGain.connect(ctx.destination);
        outputGainRef.current = outputGain;
        const initialOutput = outputMutedRef.current ? 0 : outputVolumeRef.current;
        outputGain.gain.value = initialOutput;
        splitterRef.current = splitter;
        mergerRef.current = merger;
        directGainLRef.current = directL;
        directGainRRef.current = directR;
        crossGainLRef.current = crossL;
        crossGainRRef.current = crossR;
        filtersRef.current = filters;
      } catch {
        sourceRef.current = null;
        filtersRef.current = [];
        connectedAudioRef.current = audio;
      }
    },
    [
      bands,
      bassEnhance,
      compressorAmount,
      compressorEnabled,
      enabled,
      noiseReductionMode,
      normalizerEnabled,
      stereoWidth,
    ],
  );
  const disconnect = useCallback(() => {
    teardownGraph(true);
  }, []);
  const MAX_GAIN_DB = 12;
  const setBandGain = useCallback((id: string, gain: number) => {
    const clamped = Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gain));
    setBands((prev) => prev.map((b) => (b.id === id ? { ...b, gain: clamped } : b)));
  }, []);
  const applyPreset = useCallback((gains: number[]) => {
    setBands((prev) =>
      prev.map((b, i) => ({
        ...b,
        gain: Math.max(-MAX_GAIN_DB, Math.min(MAX_GAIN_DB, gains[i] ?? 0)),
      })),
    );
  }, []);
  const toggleEnabled = useCallback(() => setEnabled((e) => !e), []);
  const toggleNormalizer = useCallback(() => {
    setNormalizerEnabled((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.NORMALIZER_ENABLED, next);
      const source = sourceRef.current;
      const normalizer = normalizerRef.current;
      const normGain = normGainRef.current;
      const nrHead = nrHighpassRef.current;
      if (source && normalizer && normGain && nrHead) {
        try {
          try {
            source.disconnect(normalizer);
          } catch {
            /* source may not be connected to normalizer */
          }
          try {
            source.disconnect(nrHead);
          } catch {
            /* source may not be connected to NR head */
          }
          normalizer.disconnect();
          normGain.disconnect();
          const ctx = ctxRef.current;
          const t = ctx?.currentTime ?? 0;
          if (next) {
            normGain.gain.setTargetAtTime(1.6, t, RAMP_TIME);
            source.connect(normalizer);
            normalizer.connect(normGain);
            normGain.connect(nrHead);
          } else {
            normGain.gain.setTargetAtTime(1.0, t, RAMP_TIME);
            source.connect(nrHead);
          }
        } catch {
          /* ok */
        }
      }
      return next;
    });
  }, []);
  const saveCustomPreset = useCallback(
    (name: string) => {
      const preset: EqPreset = { name, gains: bands.map((b) => b.gain) };
      setCustomPresets((prev) => {
        const next = prev.filter((p) => p.name !== name);
        next.push(preset);
        saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next);
        return next;
      });
    },
    [bands],
  );
  const removeCustomPreset = useCallback((name: string) => {
    setCustomPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      saveToStorage(STORAGE_KEYS.CUSTOM_EQ_PRESETS, next);
      return next;
    });
  }, []);
  const setStereoWidth = useCallback((w: number) => {
    const clamped = Math.max(0, Math.min(2, w));
    setStereoWidthState(clamped);
    saveToStorage(STORAGE_KEYS.STEREO_WIDTH, clamped);
    const direct = (1 + clamped) / 2;
    const cross = (1 - clamped) / 2;
    const ctx = ctxRef.current;
    const t = ctx?.currentTime ?? 0;
    if (directGainLRef.current) directGainLRef.current.gain.setTargetAtTime(direct, t, RAMP_TIME);
    if (directGainRRef.current) directGainRRef.current.gain.setTargetAtTime(direct, t, RAMP_TIME);
    if (crossGainLRef.current) crossGainLRef.current.gain.setTargetAtTime(cross, t, RAMP_TIME);
    if (crossGainRRef.current) crossGainRRef.current.gain.setTargetAtTime(cross, t, RAMP_TIME);
  }, []);
  const setBassEnhance = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setBassEnhanceState(clamped);
    saveToStorage(STORAGE_KEYS.BASS_ENHANCE, clamped);
    const ctx = ctxRef.current;
    if (bassMixRef.current && ctx) {
      bassMixRef.current.gain.setTargetAtTime(clamped, ctx.currentTime, RAMP_TIME);
    } else if (bassMixRef.current) bassMixRef.current.gain.value = clamped;
  }, []);
  const toggleCompressor = useCallback(() => {
    setCompressorEnabled((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.COMPRESSOR_ENABLED, next);
      const ctx = ctxRef.current;
      const t = ctx?.currentTime ?? 0;
      const amount = compressorAmount;
      if (mbDryGainRef.current && mbWetGainRef.current) {
        if (next) {
          mbDryGainRef.current.gain.setTargetAtTime(1 - amount * 0.5, t, RAMP_TIME);
          mbWetGainRef.current.gain.setTargetAtTime(amount, t, RAMP_TIME);
        } else {
          mbDryGainRef.current.gain.setTargetAtTime(1, t, RAMP_TIME);
          mbWetGainRef.current.gain.setTargetAtTime(0, t, RAMP_TIME);
        }
      }
      return next;
    });
  }, [compressorAmount]);
  const setCompressorAmount = useCallback(
    (v: number) => {
      const clamped = Math.max(0, Math.min(1, v));
      setCompressorAmountState(clamped);
      saveToStorage(STORAGE_KEYS.COMPRESSOR_AMOUNT, clamped);
      if (!compressorEnabled) return;
      const ctx = ctxRef.current;
      const t = ctx?.currentTime ?? 0;
      if (mbDryGainRef.current)
        mbDryGainRef.current.gain.setTargetAtTime(1 - clamped * 0.5, t, RAMP_TIME);
      if (mbWetGainRef.current) mbWetGainRef.current.gain.setTargetAtTime(clamped, t, RAMP_TIME);
    },
    [compressorEnabled],
  );
  const setNoiseReductionMode = useCallback(
    (mode: NoiseReductionMode) => {
      setNoiseReductionModeState(mode);
      saveToStorage(STORAGE_KEYS.NOISE_REDUCTION_MODE, mode);
      applyNoiseReductionPreset(mode);
    },
    [applyNoiseReductionPreset],
  );
  useEffect(() => {
    applyNoiseReductionPreset(noiseReductionMode);
  }, [applyNoiseReductionPreset, noiseReductionMode]);
  return {
    bands,
    enabled,
    normalizerEnabled,
    stereoWidth,
    bassEnhance,
    compressorEnabled,
    compressorAmount,
    noiseReductionMode,
    customPresets,
    setBandGain,
    applyPreset,
    toggleEnabled,
    toggleNormalizer,
    setStereoWidth,
    setBassEnhance,
    toggleCompressor,
    setCompressorAmount,
    setNoiseReductionMode,
    setOutputVolume,
    connectSource,
    disconnect,
    saveCustomPreset,
    removeCustomPreset,
  };
}
const STORAGE_KEY = 'radio-station-queue';
const MAX_QUEUE_SIZE = 20;
function useStationQueue() {
  const [queue, setQueue] = useState<Station[]>(() => loadFromStorage<Station[]>(STORAGE_KEY, []));
  const [currentIndex, setCurrentIndex] = useState(-1);
  const persistRef = useRef(false);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    if (persistRef.current) saveToStorage(STORAGE_KEY, queue);
    persistRef.current = true;
  }, [queue]);
  const add = useCallback((station: Station) => {
    setQueue((prev) => {
      if (prev.some((s) => s.stationuuid === station.stationuuid)) return prev;
      if (prev.length >= MAX_QUEUE_SIZE) return prev;
      return [...prev, station];
    });
  }, []);
  const addNext = useCallback((station: Station) => {
    let removedIdx = -1;
    setCurrentIndex((prevIdx) => {
      const q = queueRef.current;
      removedIdx = -1;
      const filtered: Station[] = [];
      for (let i = 0; i < q.length; i++) {
        if (q[i].stationuuid === station.stationuuid) { removedIdx = i; } else { filtered.push(q[i]); }
      }
      if (removedIdx < 0 && filtered.length >= MAX_QUEUE_SIZE) return prevIdx;
      let adjusted = prevIdx;
      if (removedIdx >= 0 && removedIdx < prevIdx) adjusted--;
      const insertAt = adjusted >= 0 ? Math.min(adjusted + 1, filtered.length) : 0;
      filtered.splice(insertAt, 0, station);
      setQueue(filtered);
      return adjusted;
    });
  }, []);
  const remove = useCallback((stationuuid: string) => {
    let removedIdx = -1;
    setQueue((prev) => {
      const result: Station[] = [];
      removedIdx = -1;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].stationuuid === stationuuid) { removedIdx = i; } else { result.push(prev[i]); }
      }
      return removedIdx < 0 ? prev : result;
    });
    setCurrentIndex((prev) => {
      if (removedIdx < 0) return prev;
      if (removedIdx < prev) return prev - 1;
      if (removedIdx === prev) return -1;
      return prev;
    });
  }, []);
  const clear = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);
  const moveUp = useCallback((stationuuid: string) => {
    let movedIdx = -1;
    setQueue((prev) => {
      const idx = prev.findIndex((s) => s.stationuuid === stationuuid);
      if (idx <= 0) return prev;
      movedIdx = idx;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setCurrentIndex((prev) => {
      if (movedIdx < 0) return prev;
      if (prev === movedIdx) return movedIdx - 1;
      if (prev === movedIdx - 1) return movedIdx;
      return prev;
    });
  }, []);
  const moveDown = useCallback((stationuuid: string) => {
    let movedIdx = -1;
    setQueue((prev) => {
      const idx = prev.findIndex((s) => s.stationuuid === stationuuid);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      movedIdx = idx;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setCurrentIndex((prev) => {
      if (movedIdx < 0) return prev;
      if (prev === movedIdx) return movedIdx + 1;
      if (prev === movedIdx + 1) return movedIdx;
      return prev;
    });
  }, []);
  const skipToNext = useCallback((): Station | null => {
    const q = queueRef.current;
    if (q.length === 0) return null;
    let result: Station | null = null;
    setCurrentIndex((prev) => {
      const nextIdx = prev + 1;
      if (nextIdx >= queueRef.current.length) return prev;
      result = queueRef.current[nextIdx];
      return nextIdx;
    });
    return result;
  }, []);
  const skipToPrev = useCallback((): Station | null => {
    const q = queueRef.current;
    if (q.length === 0) return null;
    let result: Station | null = null;
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      const prevIdx = prev - 1;
      result = queueRef.current[prevIdx];
      return prevIdx;
    });
    return result;
  }, []);
  const setPlaying = useCallback((stationuuid: string) => {
    const idx = queueRef.current.findIndex((s) => s.stationuuid === stationuuid);
    setCurrentIndex(idx);
  }, []);
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;
  return {
    queue,
    currentIndex,
    add,
    addNext,
    remove,
    clear,
    moveUp,
    moveDown,
    skipToNext,
    skipToPrev,
    hasNext,
    hasPrev,
    setPlaying,
  };
}
function songKey(title: string, artist: string) {
  return `${title}|||${artist}`;
}
/** Build a Set of songKeys from a song array for O(1) lookups. */ function buildKeySet(
  songs: FavoriteSong[],
): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < songs.length; i++) {
    s.add(songKey(songs[i].title, songs[i].artist));
  }
  return s;
}
function useFavoriteSongs() {
  const MAX_SONGS = 500;
  const [songs, setSongs] = useState<FavoriteSong[]>(() => {
    const loaded = loadFromStorage<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      const key = songKey(s.title, s.artist);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const keySetRef = useRef<Set<string>>(null!);
  if (!keySetRef.current) keySetRef.current = buildKeySet(songs);
  useMemo(() => {
    keySetRef.current = buildKeySet(songs);
  }, [songs]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITE_SONGS, songs);
  }, [songs]);
  useStorageSync<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, setSongs);
  const prepend = (song: Omit<FavoriteSong, 'id' | 'timestamp'>, prev: FavoriteSong[]) => {
    const now = Date.now();
    const entry: FavoriteSong = {
      ...song,
      id: _uid(),
      timestamp: now,
    };
    const next = [entry, ...prev];
    return next.length > MAX_SONGS ? (next.length = MAX_SONGS, next) : next;
  };
  const add = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs((prev) =>
      keySetRef.current.has(songKey(song.title, song.artist)) ? prev : prepend(song, prev),
    );
  }, []);
  const remove = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const toggle = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs((prev) => {
      const key = songKey(song.title, song.artist);
      const exists = prev.find((s) => songKey(s.title, s.artist) === key);
      return exists ? prev.filter((s) => s.id !== exists.id) : prepend(song, prev);
    });
  }, []);
  const has = useCallback(
    (title: string, artist: string) => keySetRef.current.has(songKey(title, artist)),
    [],
  );
  const clear = useCallback(() => setSongs([]), []);
  return { songs, add, remove, toggle, has, clear };
}
const MAX_FAVORITES = 500;
function useFavorites() {
  const [favorites, setFavorites] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.FAVORITES, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITES, favorites);
  }, [favorites]);
  useStorageSync<Station[]>(STORAGE_KEYS.FAVORITES, setFavorites);
  const favUuids = useMemo(() => {
    const s = new Set<string>();
    for (const f of favorites) s.add(f.stationuuid);
    return s;
  }, [favorites]);
  const add = useCallback((station: Station) => {
    setFavorites((prev) => {
      if (prev.some((s) => s.stationuuid === station.stationuuid)) return prev;
      const next = [station, ...prev];
      return next.length > MAX_FAVORITES ? (next.length = MAX_FAVORITES, next) : next;
    });
  }, []);
  const remove = useCallback((uuid: string) => {
    setFavorites((prev) => prev.filter((s) => s.stationuuid !== uuid));
  }, []);
  const toggle = useCallback((station: Station) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.stationuuid === station.stationuuid);
      if (exists) return prev.filter((s) => s.stationuuid !== station.stationuuid);
      const next = [station, ...prev];
      return next.length > MAX_FAVORITES ? (next.length = MAX_FAVORITES, next) : next;
    });
  }, []);
  const has = useCallback(
    (uuid: string) => favUuids.has(uuid),
    [favUuids],
  );
  const playNext = useCallback(
    (currentUuid: string): Station | null => {
      const idx = favorites.findIndex((s) => s.stationuuid === currentUuid);
      if (idx < 0 || favorites.length < 2) return null;
      return favorites[(idx + 1) % favorites.length];
    },
    [favorites],
  );
  const playPrev = useCallback(
    (currentUuid: string): Station | null => {
      const idx = favorites.findIndex((s) => s.stationuuid === currentUuid);
      if (idx < 0 || favorites.length < 2) return null;
      return favorites[(idx - 1 + favorites.length) % favorites.length];
    },
    [favorites],
  );
  return { favorites, add, remove, toggle, has, playNext, playPrev };
}
function useHistory(
  stationName: string | undefined,
  stationUuid: string | undefined,
  track: NowPlayingTrack | null,
) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    const loaded = loadFromStorage<HistoryEntry[]>(STORAGE_KEYS.HISTORY, []);
    const seen = new Set<string>();
    return loaded.filter((e) => {
      if (!e.id || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  });
  const lastTrackRef = useRef<string>('');
  const lastStationRef = useRef<string | undefined>(stationUuid);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.HISTORY, history);
  }, [history]);
  useStorageSync<HistoryEntry[]>(STORAGE_KEYS.HISTORY, setHistory);
  useEffect(() => {
    if (!track?.title || !stationUuid || !stationName) return;
    if (stationUuid !== lastStationRef.current) {
      lastStationRef.current = stationUuid;
      lastTrackRef.current = '';
      return;
    }
    const key = `${stationUuid}::${track.artist}::${track.title}`;
    if (key === lastTrackRef.current) return;
    lastTrackRef.current = key;
    const entry: HistoryEntry = {
      id: _uid(),
      stationName,
      stationUuid,
      artist: track.artist,
      title: track.title,
      album: track.album,
      artworkUrl: track.artworkUrl,
      itunesUrl: track.itunesUrl,
      durationMs: track.durationMs,
      genre: track.genre,
      releaseDate: track.releaseDate,
      trackNumber: track.trackNumber,
      trackCount: track.trackCount,
      timestamp: Date.now(),
    };
    setHistory((prev) => {
      const deduped = prev.filter(
        (e) =>
          !(
            e.title === entry.title &&
            e.artist === entry.artist &&
            e.stationUuid === entry.stationUuid
          ),
      );
      deduped.unshift(entry);
      if (deduped.length > MAX_HISTORY) deduped.length = MAX_HISTORY;
      return deduped;
    });
  }, [track?.title, track?.artist, stationUuid, stationName]);
  useEffect(() => {
    if (!track?.title || !stationUuid) return;
    const artworkUrl = track.artworkUrl;
    const album = track.album;
    const itunesUrl = track.itunesUrl;
    const durationMs = track.durationMs;
    const genre = track.genre;
    const releaseDate = track.releaseDate;
    const trackNumber = track.trackNumber;
    const trackCount = track.trackCount;
    if (
      !artworkUrl &&
      !album &&
      !itunesUrl &&
      !durationMs &&
      !genre &&
      !releaseDate &&
      trackNumber == null &&
      trackCount == null
    )
      return;
    setHistory((prev) => {
      const head = prev[0];
      if (!head) return prev;
      if (
        head.stationUuid === stationUuid &&
        head.title === track.title &&
        head.artist === track.artist &&
        (head.artworkUrl !== artworkUrl ||
          head.album !== album ||
          head.itunesUrl !== itunesUrl ||
          head.durationMs !== durationMs ||
          head.genre !== genre ||
          head.releaseDate !== releaseDate ||
          head.trackNumber !== trackNumber ||
          head.trackCount !== trackCount)
      ) {
        return [
          {
            ...head,
            artworkUrl,
            album,
            itunesUrl,
            durationMs,
            genre,
            releaseDate,
            trackNumber,
            trackCount,
          },
          ...prev.slice(1),
        ];
      }
      return prev;
    });
  }, [
    track?.artworkUrl,
    track?.album,
    track?.itunesUrl,
    track?.durationMs,
    track?.genre,
    track?.releaseDate,
    track?.trackNumber,
    track?.trackCount,
    track?.title,
    track?.artist,
    stationUuid,
  ]);
  const remove = useCallback((id: string) => {
    setHistory((prev) => prev.filter((e) => e.id !== id));
  }, []);
  const clear = useCallback(() => {
    setHistory([]);
    lastTrackRef.current = '';
  }, []);
  return { history, remove, clear };
}
type MediaSessionConfig = {
  station: Station | null;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onStop: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
};
function useMediaSession(config: MediaSessionConfig): void {
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  const { station, track, isPlaying } = config;
  const lastMetaRef = useRef('');
  useEffect(() => {
    if (!('mediaSession' in navigator) || !station) return;
    const trackTitle = track?.title || station.name;
    const trackArtist = track?.artist || 'Internet Radio';
    const artSrc = track?.artworkUrl || station.favicon;
    const rawTags = station.tags;
    const ci = rawTags ? rawTags.indexOf(',') : -1;
    const album = (ci < 0 ? rawTags : rawTags!.slice(0, ci)) || 'Live';
    const metaKey = `${trackTitle}\t${trackArtist}\t${album}\t${artSrc || ''}`;
    if (metaKey === lastMetaRef.current) return;
    lastMetaRef.current = metaKey;
    const imgSrc = artSrc || '/android-chrome-512x512.png';
    const artwork: MediaImage[] = [
      { src: imgSrc, sizes: '96x96', type: 'image/png' },
      { src: imgSrc, sizes: '128x128', type: 'image/png' },
      { src: imgSrc, sizes: '192x192', type: 'image/png' },
      { src: imgSrc, sizes: '256x256', type: 'image/png' },
      { src: imgSrc, sizes: '384x384', type: 'image/png' },
      { src: imgSrc, sizes: '512x512', type: 'image/png' },
    ];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: trackTitle,
        artist: trackArtist,
        album,
        artwork,
      });
    } catch {
      /* MediaMetadata constructor can throw on malformed artwork data */
    }
  }, [station, track]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);
  const setupHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => configRef.current.onPlay()],
      ['pause', () => configRef.current.onPause()],
      ['nexttrack', () => configRef.current.onNext()],
      ['previoustrack', () => configRef.current.onPrev()],
      ['stop', () => configRef.current.onStop()],
      [
        'seekbackward',
        () => {
          if (configRef.current.onSeekBackward) configRef.current.onSeekBackward();
        },
      ],
      [
        'seekforward',
        () => {
          if (configRef.current.onSeekForward) configRef.current.onSeekForward();
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        /* not supported */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch {
          /* ok */
        }
      }
    };
  }, []);
  useEffect(setupHandlers, [setupHandlers]);
}
function useRecent() {
  const [recent, setRecent] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.RECENT, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECENT, recent);
  }, [recent]);
  useStorageSync<Station[]>(STORAGE_KEYS.RECENT, setRecent);
  const add = useCallback((station: Station) => {
    setRecent((prev) => {
      const filtered = prev.filter((s) => s.stationuuid !== station.stationuuid);
      filtered.unshift(station);
      if (filtered.length > MAX_RECENT) filtered.length = MAX_RECENT;
      return filtered;
    });
  }, []);
  const remove = useCallback((uuid: string) => {
    setRecent((prev) => prev.filter((s) => s.stationuuid !== uuid));
  }, []);
  const clear = useCallback(() => setRecent([]), []);
  return { recent, add, remove, clear };
}
const PRESETS_MIN = [15, 30, 60] as const;
const FADE_DURATION_MS = 30_000;
function useSleepTimer(onExpire: () => void, audioRef?: React.RefObject<HTMLAudioElement | null>) {
  const [remainingMin, setRemainingMin] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const savedVolumeRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);
  const stopFade = useCallback(() => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (savedVolumeRef.current !== null && audioRef?.current) {
      audioRef.current.volume = savedVolumeRef.current;
      savedVolumeRef.current = null;
    }
    setIsFading(false);
  }, []);
  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopFade();
    endTimeRef.current = 0;
    setRemainingMin(null);
  }, [stopFade]);
  const startFade = useCallback(() => {
    if (!audioRef?.current || fadeTimerRef.current) return;
    const audio = audioRef.current;
    savedVolumeRef.current = audio.volume;
    setIsFading(true);
    const fadeStart = Date.now();
    let baseVol = audio.volume;
    let lastSetVol = audio.volume;
    fadeTimerRef.current = setInterval(() => {
      if (Math.abs(audio.volume - lastSetVol) > 0.01) {
        baseVol = audio.volume;
        savedVolumeRef.current = baseVol;
      }
      const elapsed = Date.now() - fadeStart;
      const progress = Math.min(1, elapsed / FADE_DURATION_MS);
      const factor = 1 - progress * progress;
      const target = Math.max(0, baseVol * factor);
      audio.volume = target;
      lastSetVol = target;
      if (progress >= 1) {
        clearInterval(fadeTimerRef.current!);
        fadeTimerRef.current = null;
      }
    }, 200);
  }, []);
  const start = useCallback(
    (minutes: number) => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopFade();
      endTimeRef.current = Date.now() + minutes * 60_000;
      setRemainingMin(minutes);
      timerRef.current = setInterval(() => {
        const left = Math.max(0, endTimeRef.current - Date.now());
        const mins = Math.ceil(left / 60_000);
        if (left <= 0) {
          savedVolumeRef.current = null;
          clear();
          onExpireRef.current();
        } else {
          setRemainingMin(mins);
          if (left <= FADE_DURATION_MS && audioRef?.current && !fadeTimerRef.current) startFade();
        }
      }, 1000);
    },
    [clear, stopFade, startFade],
  );
  const cycle = useCallback(() => {
    if (remainingMin === null) {
      start(PRESETS_MIN[0]);
    } else {
      const currentIdx = PRESETS_MIN.findIndex((p) => p >= remainingMin);
      const nextIdx = currentIdx + 1;
      if (nextIdx < PRESETS_MIN.length) start(PRESETS_MIN[nextIdx]);
      else clear();
    }
  }, [remainingMin, start, clear]);
  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
    },
    [],
  );
  return { remainingMin, isFading, cycle, cancel: clear };
}
function useWakeLock(shouldLock: boolean) {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [isActive, setIsActive] = useState(false);
  const requestingRef = useRef(false);
  const wantReleaseRef = useRef(false);
  const request = useCallback(async () => {
    if (
      lockRef.current ||
      requestingRef.current ||
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator)
    )
      return;
    requestingRef.current = true;
    wantReleaseRef.current = false;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (wantReleaseRef.current) {
        try {
          await lock.release();
        } catch {
          /* already released */
        }
        setIsActive(false);
        return;
      }
      lockRef.current = lock;
      setIsActive(true);
      lock.addEventListener('release', () => {
        lockRef.current = null;
        setIsActive(false);
      });
    } catch {
    } finally {
      requestingRef.current = false;
    }
  }, []);
  const release = useCallback(async () => {
    if (requestingRef.current) {
      wantReleaseRef.current = true;
      return;
    }
    if (!lockRef.current) return;
    try {
      await lockRef.current.release();
    } catch {}
    lockRef.current = null;
    setIsActive(false);
  }, []);
  useEffect(() => {
    if (shouldLock) request();
    else release();
  }, [shouldLock, request, release]);
  useEffect(() => {
    const onVisibilityChange = () => {
      if (shouldLock && !document.hidden && !lockRef.current) request();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [shouldLock, request]);
  useEffect(
    () => () => {
      release();
    },
    [release],
  );
  return { isActive, request, release };
}
type LayoutMode = 'desktop' | 'mobile' | 'pip';
function buildFavInput(t: NowPlayingTrack, s: Station): Omit<FavoriteSong, 'id' | 'timestamp'> {
  return { ...t, artist: t.artist ?? '', stationName: s.name, stationUuid: s.stationuuid };
}
function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0)
      setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}
type RadioShellProps = { isPip?: boolean; initialCountryCode?: string };
export default function RadioShell({ isPip: isPipProp, initialCountryCode }: RadioShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const layout: LayoutMode = isPipProp ? 'pip' : containerSize.w <= 640 ? 'mobile' : 'desktop';
  const radio = useRadio();
  const eq = useEqualizer();
  const { track, icyBitrate, stationBlacklisted } = useStationMeta(radio.station, radio.status === 'playing');
  const {
    lyrics,
    effectiveCurrentTime,
    realtime: realtimeLyrics,
  } = useLyrics(track, radio.station?.name, {
    currentTime: radio.currentTime,
    enableRealtime: Boolean(track?.title),
    languageHint: locale === 'es' ? 'es' : 'en',
  });
  const favs = useFavorites();
  const favSongs = useFavoriteSongs();
  const recent = useRecent();
  const sleepTimer = useSleepTimer(radio.pause, radio.audioRef);
  const stationQueue = useStationQueue();
  useWakeLock(radio.status === 'playing');
  const analyser = useAudioAnalyser({ fftSize: 2048, smoothingTimeConstant: 0.8 });
  const bgAudio = useAudioReactiveBackground(analyser.meterRef, radio.status === 'playing');
  const albumArt = useAlbumArt(track?.title ?? null, track?.artist ?? null);
  const usageStats = useStats();
  const enrichedTrack = useMemo(() => {
    if (!track) return null;
    return {
      ...track,
      album: track.album || albumArt.albumName || undefined,
      artworkUrl: track.artworkUrl || albumArt.artworkUrl || undefined,
      itunesUrl: albumArt.itunesUrl ?? undefined,
      durationMs: albumArt.durationMs ?? undefined,
      genre: albumArt.genre || undefined,
      releaseDate: albumArt.releaseDate || undefined,
      trackNumber: albumArt.trackNumber ?? undefined,
      trackCount: albumArt.trackCount ?? undefined,
    };
  }, [track, albumArt]);
  const songHistory = useHistory(radio.station?.name, radio.station?.stationuuid, enrichedTrack);
  const lastTickRef = useRef<number>(null!);
  if (lastTickRef.current === null) lastTickRef.current = Date.now();
  const { tickListenTime } = usageStats;
  useEffect(() => {
    if (radio.status !== 'playing' || !radio.station) {
      lastTickRef.current = Date.now();
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (radio.station) tickListenTime(radio.station.stationuuid, radio.station.name, delta);
    }, 5000);
    lastTickRef.current = Date.now();
    return () => clearInterval(interval);
  }, [radio.status, radio.station, tickListenTime]);
  const lastRecordedTrackRef = useRef<string | null>(null);
  const { recordSongPlay, updateSongMeta } = usageStats;
  useEffect(() => {
    if (!enrichedTrack?.title || !enrichedTrack?.artist) return;
    const key = `${enrichedTrack.title}|||${enrichedTrack.artist}`;
    if (key !== lastRecordedTrackRef.current) {
      lastRecordedTrackRef.current = key;
      recordSongPlay(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.genre,
        enrichedTrack.artworkUrl,
      );
    } else {
      updateSongMeta(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.genre,
        enrichedTrack.artworkUrl,
      );
    }
  }, [
    enrichedTrack?.title,
    enrichedTrack?.artist,
    enrichedTrack?.genre,
    enrichedTrack?.artworkUrl,
    recordSongPlay,
    updateSongMeta,
  ]);
  const [showEq, setShowEq] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [showDesktopSettings, setShowDesktopSettings] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [toast, setToast] = useState<{ msg: string; icon: 'star' | 'heart' | 'info'; key: number } | null>(
    null,
  );
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckOrigVolRef = useRef<number | null>(null);
  const duckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback(
    (msg: string, icon: 'star' | 'heart' | 'info') => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ msg, icon, key: Date.now() });
      const audio = radio.audioRef.current;
      if (audio && !audio.paused) {
        if (duckTimerRef.current) clearTimeout(duckTimerRef.current);
        if (duckOrigVolRef.current === null) duckOrigVolRef.current = audio.volume;
        audio.volume = duckOrigVolRef.current * 0.4;
        duckTimerRef.current = setTimeout(() => {
          if (audio && duckOrigVolRef.current !== null) audio.volume = duckOrigVolRef.current;
          duckOrigVolRef.current = null;
          duckTimerRef.current = null;
        }, 400);
      }
      toastTimerRef.current = setTimeout(() => setToast(null), 2500);
    },
    [radio.audioRef],
  );
  useEffect(() => {
    if (duckOrigVolRef.current !== null) duckOrigVolRef.current = radio.muted ? 0 : radio.volume;
  }, [radio.volume, radio.muted]);
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'history' | 'favorites'>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<SongDetailData | null>(null);
  function mkView(
    mode: ViewState['mode'],
    label: string,
    overrides?: Partial<ViewState>,
  ): ViewState {
    return { mode, query: '', tag: '', countryCode: '', countryQueryName: '', label, ...overrides };
  }
  function countryView(code: string): ViewState {
    const country = COUNTRY_BY_CODE[code];
    return mkView('country', getCountryDisplayName(locale, code), {
      countryCode: code,
      countryQueryName: country?.name ?? '',
    });
  }
  const resetNav = useCallback((v: ViewState) => {
    setView(v);
    setActiveTab('discover');
    setTheaterMode(false);
    setSearchQuery('');
  }, []);
  const [view, setView] = useState<ViewState>(() => {
    const code = (initialCountryCode ?? '').toUpperCase();
    if (isSovereignCountryCode(code)) return countryView(code);
    return mkView('top', t('topStations'));
  });
  useEffect(() => {
    const newLabel =
      view.mode === 'top'
        ? t('topStations')
        : view.mode === 'country' && view.countryCode
          ? getCountryDisplayName(locale, view.countryCode)
          : null;
    if (newLabel && newLabel !== view.label) setView((prev) => ({ ...prev, label: newLabel }));
  }, [locale, t, view.countryCode, view.label, view.mode]);
  useEffect(() => {
    const code = (initialCountryCode ?? '').toUpperCase();
    if (!isSovereignCountryCode(code) || !COUNTRY_BY_CODE[code]) return;
    if (view.mode === 'country' && view.countryCode === code) return;
    resetNav(countryView(code));
  }, [initialCountryCode, locale, view.countryCode, view.mode, resetNav]);
  useEffect(() => {
    const onPopState = () => {
      const p = window.location.pathname;
      const segment = (p[0] === '/' ? p.slice(1) : p).toUpperCase();
      if (!segment) {
        resetNav(mkView('top', t('topStations')));
        return;
      }
      if (isSovereignCountryCode(segment) && COUNTRY_BY_CODE[segment])
        resetNav(countryView(segment));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [locale, t, resetNav]);
  useEffect(() => {
    if (layout === 'pip') setMiniMode(false);
  }, [layout]);
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  const pbStore = usePlaybackStore;
  useEffect(() => {
    const state = pbStore.getState();
    state.setSource('radio');
    state.setPlaying(radio.status === 'playing');
    state.setVolume(radio.volume);
    state.setMuted(radio.muted);
    state.setCurrentTime(radio.currentTime);
    if (enrichedTrack) {
      state.setTrackInfo(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.artworkUrl ?? albumArt.artworkUrl,
      );
    }
  }, [
    radio.status,
    radio.volume,
    radio.muted,
    radio.currentTime,
    enrichedTrack,
    albumArt.artworkUrl,
    pbStore,
  ]);
  const { setOutputVolume, connectSource: eqConnectSource } = eq;
  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      eqConnectSource(radio.audioRef.current);
      analyser.connectAudio(radio.audioRef.current);
    }
  }, [radio.station]);
  useEffect(() => {
    setOutputVolume(1, false);
  }, [setOutputVolume]);
  const handlePlayRef = useRef({ radio, recent, stationQueue, eqConnectSource, analyser });
  useEffect(() => {
    handlePlayRef.current = { radio, recent, stationQueue, eqConnectSource, analyser };
  }, [radio, recent, stationQueue, eqConnectSource, analyser]);
  const handlePlay = useCallback((station: Station) => {
    const {
      radio: r,
      recent: rec,
      stationQueue: sq,
      eqConnectSource: eqSrc,
      analyser: an,
    } = handlePlayRef.current;
    const audio = r.ensureAudio();
    eqSrc(audio);
    an.connectAudio(audio);
    r.play(station);
    rec.add(station);
    sq.setPlaying(station.stationuuid);
    setTheaterMode(true);
    const nextIdx = sq.queue.findIndex((s) => s.stationuuid === station.stationuuid) + 1;
    if (nextIdx > 0 && nextIdx < sq.queue.length) r.prefetchStream(sq.queue[nextIdx].url_resolved);
  }, []);
  useEffect(() => {
    if (stationBlacklisted && radio.station) {
      showToast('This station is temporarily unavailable', 'info');
    }
  }, [stationBlacklisted, radio.station?.stationuuid]);
  useEffect(() => {
    let cancelled = false;
    if (radio.status === 'error') {
      if (stationQueue.hasNext) {
        const next = stationQueue.skipToNext();
        if (next) {
          radio.play(next);
          recent.add(next);
        }
      } else if (radio.station) {
        Promise.resolve({ similarStations }).then(({ similarStations }) => {
          similarStations(radio.station!, 3)
            .then((alts) => {
              if (alts.length > 0 && !cancelled) handlePlay(alts[0]);
            })
            .catch(_NOOP);
        });
      }
    }
    return () => {
      cancelled = true;
    };
  }, [radio.status]);
  const skipDepsRef = useRef({ radio, favs, stationQueue });
  useEffect(() => {
    skipDepsRef.current = { radio, favs, stationQueue };
  }, [radio, favs, stationQueue]);
  const handleSkipNext = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    if (sq.hasNext) {
      const next = sq.skipToNext();
      if (next) {
        handlePlay(next);
        return;
      }
    }
    if (r.station) {
      const next = f.playNext(r.station.stationuuid);
      if (next) handlePlay(next);
    }
  }, [handlePlay]);
  const handleSkipPrev = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    if (sq.hasPrev) {
      const prev = sq.skipToPrev();
      if (prev) {
        handlePlay(prev);
        return;
      }
    }
    if (r.station) {
      const prev = f.playPrev(r.station.stationuuid);
      if (prev) handlePlay(prev);
    }
  }, [handlePlay]);
  useMediaSession({
    station: radio.station,
    track: enrichedTrack,
    isPlaying: radio.status === 'playing',
    onPlay: radio.resume,
    onPause: radio.pause,
    onNext: handleSkipNext,
    onPrev: handleSkipPrev,
    onStop: radio.stop,
    onSeekBackward: () => radio.seek(Math.max(0, radio.currentTime - 10)),
    onSeekForward: () => radio.seek(radio.currentTime + 10),
  });
  const keydownRef = useRef({
    radio,
    handleSkipNext,
    handleSkipPrev,
    favs,
    favSongs,
    enrichedTrack,
    theaterMode,
    showEq,
    showShortcuts,
    selectedSong,
    sleepTimer,
    showToast,
    realtimeLyrics,
  });
  useEffect(() => {
    keydownRef.current = {
      radio,
      handleSkipNext,
      handleSkipPrev,
      favs,
      favSongs,
      enrichedTrack,
      theaterMode,
      showEq,
      showShortcuts,
      selectedSong,
      sleepTimer,
      showToast,
      realtimeLyrics,
    };
  }, [
    radio,
    handleSkipNext,
    handleSkipPrev,
    favs,
    favSongs,
    enrichedTrack,
    theaterMode,
    showEq,
    showShortcuts,
    selectedSong,
    sleepTimer,
    showToast,
    realtimeLyrics,
  ]);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const {
        radio: r,
        handleSkipNext: skipNext,
        handleSkipPrev: skipPrev,
        favs: f,
        favSongs: fs,
        enrichedTrack: et,
        theaterMode: tm,
        showEq: eq,
        showShortcuts: sc,
        selectedSong: ss,
        sleepTimer: st,
        showToast: toast,
        realtimeLyrics: rl,
      } = keydownRef.current;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput && e.key !== 'Escape') return;
      if (eq) {
        if (!_EQ_ALLOWED_KEYS.has(e.key)) return;
      }
      if (ss) return;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          r.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipPrev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipNext();
          break;
        case 'ArrowUp':
          e.preventDefault();
          r.setVolume(Math.min(1, r.volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          r.setVolume(Math.max(0, r.volume - 0.05));
          break;
        case 'm':
        case 'M':
          r.toggleMute();
          break;
        case 'n':
        case 'N':
          skipNext();
          break;
        case 'p':
        case 'P':
          skipPrev();
          break;
        case 'f':
        case 'F': {
          e.preventDefault();
          const searchInput =
            document.querySelector<HTMLInputElement>('[data-radio-search], .radio-search-input');
          if (searchInput) searchInput.focus();
          break;
        }
        case 's':
        case 'S':
          if (r.station) {
            const wasFav = f.has(r.station.stationuuid);
            f.toggle(r.station);
            toast(wasFav ? 'Removed from favorites' : r.station.name, 'star');
          }
          break;
        case 'Escape':
          if (sc) setShowShortcuts(false);
          else if (eq) setShowEq(false);
          else if (tm) setTheaterMode(false);
          break;
        case 't':
        case 'T':
          setTheaterMode((prev) => !prev);
          break;
        case 'e':
        case 'E':
          setShowEq((prev) => !prev);
          break;
        case 'l':
        case 'L':
          if (et?.title && r.station) {
            const wasLiked = fs.has(et.title, et.artist ?? '');
            fs.toggle(buildFavInput(et, r.station));
            toast(wasLiked ? 'Song removed' : et.title, 'heart');
          }
          break;
        case 'r':
        case 'R':
          if (rl) rl.toggle();
          break;
        case 'z':
        case 'Z':
        case '?':
          setShowShortcuts((prev) => !prev);
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
  const isSongLiked = enrichedTrack?.title
    ? favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? '')
    : false;
  const handleToggleFav = useCallback(() => {
    if (!radio.station) return;
    const wasFav = favs.has(radio.station.stationuuid);
    favs.toggle(radio.station);
    showToast(wasFav ? 'Removed from favorites' : radio.station.name, 'star');
  }, [radio.station, favs, showToast]);
  const handleFavSong = useCallback(() => {
    if (!enrichedTrack?.title || !radio.station) return;
    const wasLiked = favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? '');
    favSongs.toggle(buildFavInput(enrichedTrack, radio.station));
    showToast(wasLiked ? 'Song removed' : enrichedTrack.title, 'heart');
  }, [enrichedTrack, radio.station, favSongs, showToast]);
  const handleFavSongFromHistory = useCallback(
    (entry: HistoryEntry) => {
      const wasLiked = favSongs.has(entry.title, entry.artist);
      const { id: _, timestamp: _t, ...input } = entry;
      favSongs.toggle(input);
      showToast(wasLiked ? 'Song removed' : entry.title, 'heart');
    },
    [favSongs, showToast],
  );
  const handleSearch = useCallback(
    (query: string) => {
      const sanitized = query.trim();
      setView(mkView('search', t('searchResultLabel', { query: sanitized }), { query: sanitized }));
      setActiveTab('discover');
      setTheaterMode(false);
    },
    [t],
  );
  const handleGoHome = useCallback(() => {
    resetNav(mkView('top', t('topStations')));
    if (pathname !== '/') window.history.pushState(null, '', '/');
  }, [pathname, t, resetNav]);
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) handleSearch(searchQuery.trim());
      else handleGoHome();
    },
    [searchQuery, handleSearch, handleGoHome],
  );
  const handleSelectGenre = useCallback(
    (cat: BrowseCategory) => {
      const key = GENRE_LABEL_KEYS[cat.id];
      setView(mkView('genre', key ? t(key) : cat.label, { tag: cat.tag || cat.id }));
      setTheaterMode(false);
      setSearchQuery('');
    },
    [t],
  );
  const handleSelectCountry = useCallback(
    (countryCode: string, countryQueryName: string, countryDisplayName: string) => {
      setView(mkView('country', countryDisplayName, { countryCode, countryQueryName }));
      setTheaterMode(false);
      setSearchQuery('');
      const newPath = `/${countryCode}`;
      if (pathname !== newPath) window.history.pushState(null, '', newPath);
    },
    [pathname],
  );
  const viewKey = `${view.mode}-${view.tag}-${view.query}-${view.countryCode}`;
  const isLandingNavigation = !theaterMode;
  const theaterAudioBadges = useMemo(() => {
    if (!theaterMode || !radio.station) return [] as string[];
    const badges: string[] = [];
    if (eq.noiseReductionMode !== 'off') badges.push(t('noiseReduction'));
    if (eq.normalizerEnabled) badges.push(t('audioNormalizer'));
    if (eq.enabled) badges.push(t('equalizer'));
    if (eq.enabled && eqPreset) badges.push(t('presetLabel', { name: eqPreset }));
    return badges;
  }, [
    eq.enabled,
    eq.noiseReductionMode,
    eq.normalizerEnabled,
    eqPreset,
    radio.station,
    theaterMode,
    t,
  ]);
  const selectedFavSong = selectedSong
    ? (favSongs.songs.find(
        (s) => s.title === selectedSong.title && s.artist === selectedSong.artist,
      ) ?? null)
    : null;
  const songDetailModal = (
    <SongDetailModal
      song={selectedSong}
      onClose={() => setSelectedSong(null)}
      onRemoveFromFavorites={
        selectedFavSong
          ? () => {
              favSongs.remove(selectedFavSong.id);
              setSelectedSong(null);
            }
          : undefined
      }
    />
  );
  const shortcutsOverlay = showShortcuts ? (
    <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
  ) : null;
  const offlineBanner = !isOnline ? (
    <div
      className="fixed top-0 inset-x-0 z-[250] bg-yellow-600 text-white text-center text-[12px] font-medium py-1 select-none"
      role="alert"
    >
      {' '}
      {t('offlineBanner')}
    </div>
  ) : null;
  const eqPanelElement = showEq ? (
    <EqPanel
      bands={eq.bands}
      enabled={eq.enabled}
      normalizerEnabled={eq.normalizerEnabled}
      stereoWidth={eq.stereoWidth}
      bassEnhance={eq.bassEnhance}
      compressorEnabled={eq.compressorEnabled}
      compressorAmount={eq.compressorAmount}
      noiseReductionMode={eq.noiseReductionMode}
      customPresets={eq.customPresets}
      onSetGain={eq.setBandGain}
      onApplyPreset={eq.applyPreset}
      onToggleEnabled={eq.toggleEnabled}
      onToggleNormalizer={eq.toggleNormalizer}
      onSetStereoWidth={eq.setStereoWidth}
      onSetBassEnhance={eq.setBassEnhance}
      onToggleCompressor={eq.toggleCompressor}
      onSetCompressorAmount={eq.setCompressorAmount}
      onSetNoiseReductionMode={eq.setNoiseReductionMode}
      onSaveCustomPreset={eq.saveCustomPreset}
      onRemoveCustomPreset={eq.removeCustomPreset}
      onPresetChange={setEqPreset}
      onClose={() => setShowEq(false)}
    />
  ) : null;
  const toastElement = toast ? (
    <motion.div
      key={toast.key}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {' '}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[13px] font-medium shadow-lg whitespace-nowrap max-w-[260px] overflow-hidden">
        {' '}
        {toast.icon === 'star' ? (
          <Star size={13} className="fill-sys-orange text-sys-orange flex-shrink-0" />
        ) : toast.icon === 'heart' ? (
          <Heart size={13} className="fill-pink-400 text-pink-400 flex-shrink-0" />
        ) : (
          <span className="text-[13px] flex-shrink-0">⚠️</span>
        )}{' '}
        <span className="truncate">{toast.msg}</span>
      </div>
    </motion.div>
  ) : null;
  const mkNavTabs = (sz: number) => [
    { id: 'discover' as const, label: t('discover'), icon: <RadioIcon size={sz} /> },
    { id: 'history' as const, label: t('history'), icon: <Clock size={sz} /> },
    { id: 'favorites' as const, label: t('favorites'), icon: <Heart size={sz} /> },
  ];
  const navTabs14 = useMemo(() => mkNavTabs(14), [t]);
  const navTabs13 = useMemo(() => mkNavTabs(13), [t]);
  const theaterBaseProps = {
    track: enrichedTrack,
    isPlaying: radio.status === 'playing',
    frequencyDataRef: analyser.frequencyDataRef,
    artworkUrl: albumArt.artworkUrl,
    icyBitrate,
    onFavSong: enrichedTrack?.title ? handleFavSong : undefined,
    isSongLiked,
    lyrics,
    currentTime: effectiveCurrentTime,
    activeLineOverride: realtimeLyrics?.activeLineIndex,
  };
  const theaterFullProps = {
    ...theaterBaseProps,
    station: radio.station!,
    onBack: () => setTheaterMode(false),
    onToggleFav: radio.station ? handleToggleFav : undefined,
    isFavorite: radio.station ? favs.has(radio.station.stationuuid) : false,
  };
  const nowPlayingBaseProps = {
    station: radio.station,
    track: enrichedTrack,
    status: radio.status,
    volume: radio.volume,
    muted: radio.muted,
    frequencyDataRef: analyser.frequencyDataRef,
    icyBitrate,
    streamQuality: radio.streamQuality,
    onTogglePlay: radio.togglePlay,
    onSetVolume: radio.setVolume,
    onToggleMute: radio.toggleMute,
    sleepTimerMin: sleepTimer.remainingMin,
    onCycleSleepTimer: sleepTimer.cycle,
  };
  const nowPlayingFullProps = {
    ...nowPlayingBaseProps,
    onToggleEq: () => setShowEq((s) => !s),
    onToggleTheater: () => setTheaterMode(true),
    onToggleFav: radio.station ? handleToggleFav : undefined,
    onFavSong: enrichedTrack?.title ? handleFavSong : undefined,
    isFavorite: radio.station ? favs.has(radio.station.stationuuid) : false,
    songLiked: isSongLiked,
    eqPresetActive: eqPreset !== null,
    showEq,
    theaterMode,
  };
  const browseViewElement = (
    <BrowseView
      view={view}
      currentStation={radio.station}
      isPlaying={radio.status === 'playing'}
      isFavorite={favs.has}
      onPlay={handlePlay}
      onToggleFav={favs.toggle}
      onPrefetch={radio.prefetchStream}
      favorites={favs.favorites}
      recent={recent.recent}
      onSelectGenre={handleSelectGenre}
      onSelectCountry={handleSelectCountry}
      onGoHome={handleGoHome}
      userGenreOrder={usageStats.genreOrder}
    />
  );
  const historyViewElement = (
    <HistoryGridView
      history={songHistory.history}
      onRemove={songHistory.remove}
      onClear={songHistory.clear}
      onToggleFavSong={handleFavSongFromHistory}
      isSongFavorite={favSongs.has}
      onSelect={setSelectedSong}
    />
  );
  const favsViewElement = (
    <FavoriteSongsView
      songs={favSongs.songs}
      onRemove={favSongs.remove}
      onClear={favSongs.clear}
      onSelect={setSelectedSong}
    />
  );
  const primaryGenre = useMemo(() => {
    const t = radio.station?.tags;
    if (!t) return undefined;
    const ci = t.indexOf(',');
    return (ci < 0 ? t : t.slice(0, ci)).trim().toLowerCase() || undefined;
  }, [radio.station?.tags]);
  const parallaxElement = (
    <ParallaxBackground
      faviconUrl={radio.station?.favicon}
      genre={primaryGenre}
      audioAmplitude={bgAudio.amplitude}
      landingMode={isLandingNavigation}
    />
  );
  const nowPlayingHeroElement = radio.station ? (
    <NowPlayingHero
      station={radio.station}
      track={enrichedTrack}
      isPlaying={radio.status === 'playing'}
      frequencyDataRef={analyser.frequencyDataRef}
      artworkUrl={albumArt.artworkUrl}
      icyBitrate={icyBitrate}
      onTheater={() => setTheaterMode(true)}
    />
  ) : null;
  const sharedModals = (
    <>
      {' '}
      {songDetailModal} {shortcutsOverlay} {offlineBanner} <OnboardingModal />
    </>
  );
  const pulseLogoButton = (
    <button
      onClick={handleGoHome}
      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      aria-label="Go to home"
    >
      {' '}
      <div className="relative w-5 h-5 flex-shrink-0">
        {' '}
        <UiImage
          src="/favicon-32x32.png"
          alt="Pulse"
          className="object-contain"
          sizes="20px"
          priority
        />{' '}
      </div>
      <span className="text-[15px] font-semibold text-white">Pulse</span>
    </button>
  );
  const emptyStation = useMemo(
    (): Station => ({
      name: t('discover'),
      url_resolved: '',
      stationuuid: '',
      favicon: '',
      tags: '',
      codec: '',
      bitrate: 0,
      country: '',
      countrycode: '',
      votes: 0,
    }),
    [t],
  );
  const glassStyle = {
    background: 'rgba(30, 32, 45, 0.62)',
    backdropFilter: 'blur(20px) saturate(1.8)',
    WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
  } as const;
  if (layout === 'pip') {
    return (
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
      >
        {' '}
        {parallaxElement}{' '}
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
          {' '}
          <TheaterView
            {...theaterBaseProps}
            station={radio.station ?? emptyStation}
            onBack={_NOOP}
            compact
          />
        </div>{' '}
        <NowPlayingBar
          {...nowPlayingBaseProps}
          onToggleEq={_NOOP}
          showEq={false}
          theaterMode={true}
          compact
        />{' '}
        {sharedModals}
      </div>
    );
  }
  if (layout === 'mobile') {
    return (
      <div
        ref={containerRef}
        className="relative h-full bg-[#0a0f1a] text-white overflow-hidden select-none"
      >
        {' '}
        {parallaxElement} {/* Single scrollable area — content scrolls behind sticky header */}{' '}
        <div className="h-full overflow-y-auto relative z-10">
          {' '}
          {/* Sticky header — glassmorphism (content scrolls underneath) */}{' '}
          {!theaterMode && (
            <div
              data-testid="mobile-header"
              className="sticky top-0 z-30 safe-top border-b border-white/10"
              style={glassStyle}
            >
              {' '}
              <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                {' '}
                {pulseLogoButton} <div className="flex-1" />{' '}
                <button
                  onClick={() => setShowMobileSettings(true)}
                  className="w-11 h-11 flex-center-row rounded-xl text-white/45 hover:text-white/60 transition-colors active:scale-95 flex-shrink-0"
                  title="Settings"
                  data-testid="mobile-settings-btn"
                >
                  <Settings size={18} />
                </button>{' '}
                {radio.station && (
                  <button
                    onClick={radio.station ? handleToggleFav : undefined}
                    aria-label={
                      radio.station && favs.has(radio.station.stationuuid)
                        ? t('removeFromFavorites')
                        : t('addToFavorites')
                    }
                    className={`w-11 h-11 flex-center-row rounded-xl transition-colors active:scale-95 flex-shrink-0 ${radio.station && favs.has(radio.station.stationuuid) ? 'text-sys-orange' : 'text-white/45'}`}
                  >
                    {' '}
                    <Star
                      size={18}
                      className={
                        radio.station && favs.has(radio.station.stationuuid)
                          ? 'fill-sys-orange'
                          : ''
                      }
                    />{' '}
                  </button>
                )}
              </div>
            </div>
          )}{' '}
          {theaterMode && radio.station ? (
            <div className="h-full flex flex-col">
              {' '}
              <div className="flex-1 min-h-0">
                <TheaterView {...theaterFullProps} lyricsVariant="mobile" />
              </div>{' '}
              {/* Spacer for absolute bottom bar */} <div className="h-20 shrink-0" />
            </div>
          ) : (
            <div className="flex flex-col min-h-full pb-24">
              {' '}
              {nowPlayingHeroElement} {/* ── Mobile top nav tabs + search ── */}{' '}
              <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-2">
                {navTabs14.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all active:scale-95 flex-shrink-0 ${activeTab === tab.id ? 'bg-white/10 text-white shadow-sm' : 'text-white/45 hover:text-white/60 hover:bg-white/[0.04]'}`}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-shrink-0 px-4 pb-2">
                {' '}
                <form onSubmit={handleSearchSubmit}>
                  {' '}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.05]">
                    {' '}
                    <Search size={13} className="text-white/45 flex-shrink-0" />{' '}
                    <input
                      type="search"
                      placeholder={t('searchStations')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label={t('searchStationsAria')}
                      className="bg-transparent text-white text-[13px] placeholder:text-white/50 outline-none w-full min-w-0"
                      data-radio-search
                    />
                  </div>
                </form>
              </div>
              <div className="flex-1 min-h-0">
                {' '}
                {activeTab === 'discover'
                  ? browseViewElement
                  : activeTab === 'history'
                    ? historyViewElement
                    : favsViewElement}{' '}
              </div>
            </div>
          )}
        </div>{' '}
        {/* EQ panel overlay */} {eqPanelElement} {/* Mobile settings panel */}{' '}
        <AnimatePresence>
          {showMobileSettings && (
            <MobileSettingsPanel
              onClose={() => setShowMobileSettings(false)}
              eq={eq}
              onPresetChange={setEqPreset}
              statsData={{
                topStations: usageStats.topStations,
                topSongs: usageStats.topSongs,
                topArtists: usageStats.topArtists,
                topGenres: usageStats.topGenres,
                totalListenMs: usageStats.stats.totalListenMs,
              }}
            />
          )}
        </AnimatePresence>{' '}
        {/* Toast notification */} <AnimatePresence>{toastElement}</AnimatePresence>{' '}
        {/* Bottom bar — glassmorphism — absolute so content scrolls behind it */}{' '}
        <div
          data-testid="mobile-bottom-bar"
          className="absolute bottom-0 inset-x-0 z-20 border-t border-white/10"
          style={glassStyle}
        >
          {' '}
          <NowPlayingBar {...nowPlayingFullProps} compact />
        </div>
        {sharedModals}
      </div>
    );
  }
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
    >
      {' '}
      {parallaxElement}{' '}
      <div className="flex flex-1 min-h-0 relative z-10">
        {' '}
        {/* Main content */}{' '}
        <div className="col-fill min-w-0">
          <AnimatePresence mode="wait">
            {' '}
            {theaterMode && radio.station && !miniMode ? (
              <motion.div
                key="theater"
                initial={_MOTION_FADE_IN}
                animate={_MOTION_FADE_VISIBLE}
                exit={_MOTION_FADE_OUT}
                transition={_MOTION_T_03}
                className="flex-1 min-h-0"
              >
                <TheaterView {...theaterFullProps} lyricsVariant="desktop" />
              </motion.div>
            ) : !miniMode ? (
              <React.Fragment key="browse">
                {' '}
                {/* ── Pulse branding header ── */}{' '}
                <div className="shrink-0 px-5 py-3">
                  <div className="flex items-center gap-3">
                    {' '}
                    {pulseLogoButton} <div className="flex-1" /> <LanguageSelector />
                    <button
                      onClick={() => setShowDesktopSettings(true)}
                      className="w-11 h-11 flex items-center justify-center rounded-xl text-white/45 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
                      title="Settings"
                      data-testid="desktop-settings-btn"
                    >
                      <Settings size={18} />
                    </button>
                  </div>
                </div>{' '}
                {nowPlayingHeroElement} {/* ── Top nav: tabs + search ── */}{' '}
                <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1">
                  {navTabs13.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 ${activeTab === tab.id ? 'bg-surface-6 text-white' : 'text-dim hover:text-white/60 hover:bg-surface-2'}`}
                    >
                      {tab.icon} {tab.label}{' '}
                      {tab.id === 'history' && songHistory.history.length > 0 && (
                        <span className="text-[11px] text-dim ml-0.5">
                          {songHistory.history.length}
                        </span>
                      )}{' '}
                      {tab.id === 'favorites' && favSongs.songs.length > 0 && (
                        <span className="text-[11px] text-dim ml-0.5">{favSongs.songs.length}</span>
                      )}
                    </button>
                  ))}{' '}
                  {/* Search input — fills remaining space */}{' '}
                  <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 ml-2">
                    {' '}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/[0.05]">
                      {' '}
                      <Search size={12} className="text-dim flex-shrink-0" />{' '}
                      <input
                        type="search"
                        placeholder={t('searchStations')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label={t('searchStationsAria')}
                        className="bg-transparent text-white placeholder:text-white/50 outline-none w-full min-w-0"
                        data-radio-search
                      />
                    </div>
                  </form>
                </div>{' '}
                {/* ── Tab content ── */}{' '}
                <AnimatePresence mode="wait">
                  {' '}
                  {(() => {
                    const [key, content, extra] =
                      activeTab === 'discover'
                        ? [viewKey, browseViewElement, '']
                        : activeTab === 'history'
                          ? ['history-tab', historyViewElement, ' overflow-y-auto']
                          : ['favorites-tab', favsViewElement, ' overflow-y-auto'];
                    return (
                      <motion.div
                        key={key}
                        initial={_MOTION_FADE_IN}
                        animate={_MOTION_FADE_VISIBLE}
                        exit={_MOTION_FADE_OUT}
                        transition={{ duration: 0.15 }}
                        className={`flex-1 min-h-0${extra}`}
                      >
                        {' '}
                        {content}
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </React.Fragment>
            ) : (
              radio.station && (
                <div key="mini" className="flex-row-4 px-6 py-4 flex-1">
                  {' '}
                  {albumArt.artworkUrl ? (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      {' '}
                      <UiImage
                        src={albumArt.artworkUrl}
                        alt=""
                        className="object-cover"
                        sizes="56px"
                        loading="lazy"
                      />{' '}
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-2 flex-shrink-0" />
                  )}{' '}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-white truncate">
                      {' '}
                      {enrichedTrack?.title || radio.station.name}
                    </p>{' '}
                    <p className="text-[12px] text-muted truncate">
                      {enrichedTrack?.artist || t('internetRadio')}
                    </p>{' '}
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>
      </div>{' '}
      {/* EQ panel overlay */} {eqPanelElement} {/* Toast notification */}{' '}
      <AnimatePresence>{toastElement}</AnimatePresence> {/* Bottom bar — glassmorphism */}{' '}
      <div className="relative z-10 border-t border-white/10" style={glassStyle}>
        {' '}
        <div className="pointer-events-none absolute -top-14 inset-x-3 z-10 flex items-center justify-between gap-3">
          {' '}
          <div className="min-w-0 flex flex-col items-start gap-1.5 text-[11px] overflow-hidden">
            {' '}
            {theaterAudioBadges.length > 0 && (
              <div
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full"
                style={_GLASS_BADGE_STYLE}
              >
                {' '}
                <span className="text-white/70 shrink-0">{t('autoAudioEnhancements')}</span>{' '}
                {theaterAudioBadges.map((label) => (
                  <span
                    key={label}
                    className="px-2 py-0.5 rounded-full bg-sys-orange/20 border border-sys-orange/40 text-sys-orange font-medium whitespace-nowrap shrink-0"
                  >
                    {' '}
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setMiniMode((m) => !m)}
            className="pointer-events-auto shrink-0 p-2 rounded bg-surface-2 hover:bg-surface-5 text-muted-hover"
            title={miniMode ? t('expand') : t('minimize')}
          >
            {' '}
            {miniMode ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>{' '}
        </div>
        <NowPlayingBar {...nowPlayingFullProps} />
      </div>
      {/* Desktop settings modal */}
      <AnimatePresence>
        {showDesktopSettings && (
          <MobileSettingsPanel
            onClose={() => setShowDesktopSettings(false)}
            eq={eq}
            onPresetChange={setEqPreset}
            statsData={{
              topStations: usageStats.topStations,
              topSongs: usageStats.topSongs,
              topArtists: usageStats.topArtists,
              topGenres: usageStats.topGenres,
              totalListenMs: usageStats.stats.totalListenMs,
            }}
            desktop
          />
        )}
      </AnimatePresence>
      {sharedModals}
    </div>
  );
}
