/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Music,
  Music2,
  Radio as RadioIcon,
  ScanSearch,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react';
import type { Station, ViewState, BrowseCategory } from '../constants';
import type { PopularStation } from '../hooks/usePopularStations';
import { GENRE_LABEL_KEYS, GENRE_CATEGORIES } from '../constants';
import { useLocale } from '@/context/LocaleContext';
import { useMediaQuery } from 'usehooks-ts';
import {
  searchStations,
  stationsByTag,
  stationsByCountry,
  trendingStations,
  localStations,
} from '@/logic/radio-api';
import { getCountryChipsForLocale } from '@/logic/country-chips';
import { fetchIcyMeta, parseTrack } from '@/logic/station-meta';
import StationCard from '../components/cards/StationCard';
import { LiquidGlassButton } from '../components/buttons/LiquidGlassButton';

/* ── local constants ── */

const BROWSE_ORDER = [
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
const _EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();
const _EVT_PASSIVE: AddEventListenerOptions = { passive: true };
const _SKELETON_INDICES = [0, 1, 2, 3, 4];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <Zap size={14} className="text-amber-400/70" aria-hidden="true" />,
  local: <MapPin size={14} className="text-emerald-400/70" aria-hidden="true" />,
};

const SCROLL_CLASS =
  'flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]';

/* ── types ── */

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
  popularStations?: PopularStation[];
};

type LiveInfo = {
  status: 'loading' | 'loaded' | 'error';
  track: { title: string; artist: string } | null;
};

/* ── ScrollRow helper ── */

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
      <div
        ref={ref}
        className={SCROLL_CLASS + (isMobile ? ' px-4' : '')}
        role="region"
        aria-roledescription="carousel"
        aria-label={title ?? 'Station carousel'}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

/* ── BrowseView ── */

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
  popularStations,
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
  const [liveData, setLiveData] = useState<Record<string, LiveInfo>>({});
  const [scanEnabled, setScanEnabled] = useState(false);
  const [songFilter, setSongFilter] = useState('');
  const songFilterTrimmed = useMemo(() => songFilter.trim(), [songFilter]);
  const scanGenRef = useRef(0);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {' '}
      {/* Header */}{' '}
      <div className={`${isMobile ? 'px-4' : 'px-5'} pt-4 pb-3 shrink-0 flex-between`}>
        {' '}
        <div>
          <h2 className={`${isMobile ? 'text-base' : 'text-lg'} font-semibold text-white`}>
            {view.label}
          </h2>{' '}
          <p className="text-[12px] text-white/55 mt-0.5">
            {' '}
            {loading ? t('loadingStations') : t('stationCount', { count: displayCount })}
          </p>
        </div>
        <button
          onClick={() => setDiscoveryMode((d) => !d)}
          className={`flex-row-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-colors ${discoveryMode ? 'bg-sys-purple/20 text-sys-purple border border-sys-purple/30' : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70 bdr'}`}
          title={t('discoveryModeTitle')}
          aria-pressed={discoveryMode}
          aria-label={t('discoveryModeAria')}
        >
          <Sparkles size={12} /> {t('discovery')}
          {discoveryMode ? ` ${t('discoveryOn')}` : ''}
        </button>
      </div>{' '}
      {/* Genre chips — single scrollable row + dropdown */}{' '}
      {(() => {
        const ROW_LIMIT = 6;
        const visibleGenres = translatedGenreCategories.slice(0, ROW_LIMIT);
        const allSorted = [...translatedGenreCategories].sort((a, b) =>
          a.label.localeCompare(b.label),
        );
        return (
          <div
            className={`shrink-0 flex items-center gap-1.5 ${isMobile ? 'px-3' : 'px-4'} pb-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
          >
            <button
              onClick={() => onGoHome?.()}
              className={`px-3 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${view.mode !== 'genre' ? 'bg-surface-6 text-white' : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70'}`}
            >
              {t('all')}
            </button>{' '}
            {visibleGenres.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectGenre?.(cat)}
                aria-current={genreChipActive(cat.tag ?? cat.id) || undefined}
                className={`px-3 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${genreChipActive(cat.tag ?? cat.id) ? `bg-linear-to-r ${cat.gradient} text-white` : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70'}`}
              >
                {cat.label}
              </button>
            ))}{' '}
            <LiquidGlassButton className="!rounded-full shrink-0 px-2 py-2 text-[12px]">
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (!id) return;
                  const cat = translatedGenreCategories.find((c) => c.id === id);
                  if (cat) onSelectGenre?.(cat);
                  e.target.value = '';
                }}
                className="bg-transparent text-white/50 text-[12px] font-medium cursor-pointer outline-none appearance-none"
                aria-label="Browse all genres"
                style={{ backgroundImage: 'none', paddingRight: '0px' }}
              >
                <option value="" disabled hidden>
                  🔍 …
                </option>
                {allSorted.map((cat) => (
                  <option
                    key={cat.id}
                    value={cat.id}
                    style={{ background: '#1a1a2e', color: '#fff' }}
                  >
                    {cat.label}
                  </option>
                ))}
              </select>
            </LiquidGlassButton>
          </div>
        );
      })()}{' '}
      {/* Country chips — single scrollable row with top countries + dropdown */}{' '}
      {(() => {
        const COUNTRY_ROW_LIMIT = 6;
        const visibleCountries = countryChips.slice(0, COUNTRY_ROW_LIMIT);
        const allSorted = [...countryChips].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        );
        return (
          <div
            className={`shrink-0 flex items-center gap-1.5 ${isMobile ? 'px-3' : 'px-4'} pb-3 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
          >
            <button
              onClick={() => onGoHome?.()}
              className={`px-3 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${view.mode !== 'country' ? 'bg-surface-6 text-white' : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70'}`}
            >{`🌐 ${t('allCountries')}`}</button>{' '}
            {visibleCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => onSelectCountry?.(c.code, c.queryName, c.displayName)}
                aria-current={countryChipActive(c.code) || undefined}
                className={`flex items-center gap-1 px-3 py-2 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${countryChipActive(c.code) ? 'bg-surface-6 text-white' : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70'}`}
              >
                <span>{c.flag}</span>
                <span>{c.displayName}</span>
              </button>
            ))}{' '}
            <LiquidGlassButton className="!rounded-full shrink-0 px-2 py-2 text-[12px]">
              <select
                value=""
                onChange={(e) => {
                  const code = e.target.value;
                  if (!code) return;
                  const c = countryChips.find((x) => x.code === code);
                  if (c) onSelectCountry?.(c.code, c.queryName, c.displayName);
                  e.target.value = '';
                }}
                className="bg-transparent text-white/50 text-[12px] font-medium cursor-pointer outline-none appearance-none"
                aria-label="Browse all countries"
                style={{ backgroundImage: 'none', paddingRight: '0px' }}
              >
                <option value="" disabled hidden>
                  🌍 …
                </option>
                {allSorted.map((c) => (
                  <option
                    key={c.code}
                    value={c.code}
                    style={{ background: '#1a1a2e', color: '#fff' }}
                  >
                    {c.flag} {c.displayName}
                  </option>
                ))}
              </select>
            </LiquidGlassButton>
          </div>
        );
      })()}{' '}
      {/* Content */}{' '}
      <div className={`app-body ${isMobile ? 'px-0' : 'px-4'} pb-4 overflow-y-auto`}>
        {loading && (
          <div className="flex-center-row py-16" role="status" aria-label="Loading stations">
            <Loader2 size={24} className="text-white/50 animate-spin" />
          </div>
        )}{' '}
        {error && (
          <div className="flex-center-col gap-3 py-16" role="alert">
            <RadioIcon size={32} className="text-muted" aria-hidden="true" />{' '}
            <p className="text-[13px] text-white/60">{t('failedToLoad')}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-1.5 rounded-lg bg-surface-3 text-[12px] font-medium text-white/60 hover:text-white hover:bg-surface-4 transition-colors"
            >
              {t('retry')}
            </button>
          </div>
        )}{' '}
        {!loading && !error && view.mode !== 'top' && stations.length === 0 && (
          <div className="flex-center-col py-16">
            <RadioIcon size={32} className="text-white/55 mb-2" />{' '}
            <p className="text-[13px] text-white/60">{t('noStationsFound')}</p>
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
                    icon={<Star size={14} className="text-sys-orange/70" aria-hidden="true" />}
                    isMobile={isMobile}
                  >
                    {renderScrollStations(favorites)}
                  </ScrollRow>
                )}{' '}
                {/* Recent stations row */}{' '}
                {recent && recent.length > 0 && (
                  <ScrollRow
                    title={t('recent')}
                    icon={<Clock size={14} className="text-blue-400/70" aria-hidden="true" />}
                    isMobile={isMobile}
                  >
                    {renderScrollStations(recent)}
                  </ScrollRow>
                )}{' '}
                {/* Users Playing Now row */}{' '}
                {popularStations && popularStations.length > 0 && (
                  <div className="mb-4">
                    <div
                      className={`flex items-center justify-between mb-2 ${isMobile ? 'px-4' : ''}`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center justify-center w-5 h-5 rounded-full"
                          style={{
                            background: 'linear-gradient(135deg, #22d3ee, #8b5cf6, #d946ef)',
                            boxShadow: '0 0 8px rgba(139, 92, 246, 0.5)',
                          }}
                          aria-hidden="true"
                        >
                          <Users size={11} className="text-white" />
                        </span>
                        <h3
                          className="text-[13px] font-semibold"
                          style={{
                            background: 'linear-gradient(90deg, #22d3ee, #a78bfa, #e879f9)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {t('usersPlayingNow')}
                        </h3>
                      </div>
                    </div>
                    <div
                      className={`relative rounded-xl p-[1px] ${isMobile ? 'mx-4' : ''}`}
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(34,211,238,0.3), rgba(139,92,246,0.3), rgba(217,70,239,0.2))',
                      }}
                    >
                      <div
                        className="rounded-xl overflow-hidden"
                        style={{
                          background: 'rgba(15, 12, 28, 0.7)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                        }}
                      >
                        <div
                          className={`flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 pt-3 px-3 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}
                          role="region"
                          aria-roledescription="carousel"
                          aria-label={t('usersPlayingNow')}
                          tabIndex={0}
                        >
                          {popularStations.map(({ station, liveTrack }) => (
                            <div
                              key={station.stationuuid}
                              className={`snap-start shrink-0 ${itemWidth}`}
                            >
                              <StationCard
                                station={station}
                                isCurrent={station.stationuuid === currentStation?.stationuuid}
                                isPlaying={
                                  isPlaying && station.stationuuid === currentStation?.stationuuid
                                }
                                isFavorite={isFavorite(station.stationuuid)}
                                onPlay={() => onPlay(station)}
                                onToggleFav={() => onToggleFav(station)}
                                onPrefetch={() => onPrefetch?.(station.url_resolved)}
                                liveStatus="loaded"
                                liveTrack={liveTrack}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
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
                      <Music size={14} className="text-white/50" />
                    ));
                  return (
                    <ScrollRow key={catId} title={cat.label} icon={icon} isMobile={isMobile}>
                      {' '}
                      {!catStations && failedCategories.has(catId) ? (
                        <div
                          className={`snap-start shrink-0 ${itemWidth} h-45 rounded-xl bg-surface-2 flex-center-col gap-2`}
                        >
                          {' '}
                          <RadioIcon size={18} className="text-muted" aria-hidden="true" />{' '}
                          <p className="text-[12px] text-muted" role="alert">
                            {t('failedToLoadStations')}
                          </p>
                          <button
                            onClick={() => loadCategory(catId)}
                            className="px-3 py-1 rounded-lg bg-surface-4 text-[12px] text-white/60 hover:text-white hover:bg-surface-5 transition-colors"
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
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-medium transition-colors shrink-0 ${scanEnabled ? 'bg-sys-orange/20 text-sys-orange border border-sys-orange/30' : 'bg-surface-2 text-white/50 hover:bg-surface-4 hover:text-white/70 bdr'}`}
                        title={t('scanNowPlaying')}
                        aria-label={t('scanNowPlaying')}
                        aria-pressed={scanEnabled}
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
                          <Music2
                            size={11}
                            className="text-white/50 shrink-0"
                            aria-hidden="true"
                          />{' '}
                          <input
                            type="text"
                            placeholder={t('filterBySong')}
                            aria-label={t('filterBySong')}
                            value={songFilter}
                            onChange={(e) => setSongFilter(e.target.value)}
                            autoComplete="off"
                            className="bg-transparent text-white placeholder:text-white/50 outline-none focus-visible:ring-2 focus-visible:ring-accent/70 w-full min-w-0"
                          />{' '}
                          {songFilter && (
                            <button
                              onClick={() => setSongFilter('')}
                              className="text-white/50 hover:text-white shrink-0"
                              aria-label="Clear filter"
                            >
                              {' '}
                              <X size={11} />
                            </button>
                          )}
                        </div>
                      )}{' '}
                      {scanEnabled && songFilter && (
                        <span className="text-[12px] text-white/50 shrink-0">
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
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === 0 ? 'text-white/35 cursor-default' : 'bg-surface-2 text-white/60 hover:bg-surface-4 hover:text-white'}`}
                        >
                          <ChevronLeft size={14} aria-hidden="true" /> {t('previous')}
                        </button>
                        <span className="text-[12px] text-white/50 tabular-nums">
                          {' '}
                          {t('pageFraction', { current: page + 1, total: totalPages })}
                        </span>
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                          disabled={page === totalPages - 1}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === totalPages - 1 ? 'text-white/35 cursor-default' : 'bg-surface-2 text-white/60 hover:bg-surface-4 hover:text-white'}`}
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

export default BrowseView;
export type { BrowseViewProps };
