/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo, } from "react";
import { ChevronLeft, ChevronRight, Loader2, Radio, Sparkles, Zap, Music, MapPin, Star, Clock, Music2, ScanSearch, X } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import type { Station, ViewState, BrowseCategory } from "../types";
import { GENRE_CATEGORIES, GENRE_LABEL_KEYS } from "../constants";
import { searchStations, stationsByTag, stationsByCountry, trendingStations, localStations } from "../services/radioApi";
import { fetchIcyMeta, parseTrack } from "../hooks/useStationMeta";
import StationCard from "./StationCard";
import { useLocale } from "@/context/LocaleContext";
import { getCountryChipsForLocale } from "@/lib/i18n/countryChips";

/** Order in which category sections appear on the home screen */
const BROWSE_ORDER = [ 'trending', 'pop', 'rock', 'jazz', 'classical', 'electronic',
  'hiphop', 'country', 'ambient', 'lofi', 'news', 'latin', 'metal', 'local', 'world',
] as const;
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <Zap size={14} className="text-amber-400/70" />,
  local: <MapPin size={14} className="text-emerald-400/70" />,
};
type Props = {
  view: ViewState; currentStation: Station | null; isPlaying: boolean; isFavorite: (uuid: string) => boolean;
  onPlay: (station: Station) => void; onToggleFav: (station: Station) => void;
  onPrefetch?: (streamUrl: string) => void; favorites?: Station[];
  recent?: Station[]; onSelectGenre?: (cat: BrowseCategory) => void;
  onSelectCountry?: (countryCode: string, countryQueryName: string, countryDisplayName: string) => void;
  onGoHome?: () => void; userGenreOrder?: string[];
};
const SCROLL_CLASS =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]";

/* ── Scroll row with left/right arrow buttons (desktop only) ── */
function ScrollRow({ title, icon, children, isMobile, className, }: {
  title?: string; icon?: React.ReactNode; children: React.ReactNode; isMobile: boolean; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null); const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const check = useCallback(() => {
    const el = ref.current; if (!el) return; setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return; check();
    el.addEventListener("scroll", check, { passive: true }); const ro = new ResizeObserver(check);
    ro.observe(el); return () => { el.removeEventListener("scroll", check); ro.disconnect(); };
  }, [check, children]);
  const scroll = (dir: -1 | 1) => { ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" }); };
  return (
    <div className={`mb-4 ${className ?? ""}`}>
      {title && (
        <div className={`flex items-center justify-between mb-2 ${isMobile ? "px-4" : ""}`}>
          <div className="flex-row-1.5">
            {icon} <h3 className="text-[13px] font-semibold text-soft">{title}</h3></div>
          {!isMobile && (
            <div className="flex gap-1"><button
                onClick={() => scroll(-1)}
                className={`p-1 rounded-md transition-colors ${canLeft ? "text-secondary hover:text-white hover:bg-surface-3" : "text-white/10 cursor-default"}`}
                disabled={!canLeft}
                aria-label="Scroll left"><ChevronLeft size={14} /></button><button
                onClick={() => scroll(1)}
                className={`p-1 rounded-md transition-colors ${canRight ? "text-secondary hover:text-white hover:bg-surface-3" : "text-white/10 cursor-default"}`}
                disabled={!canRight}
                aria-label="Scroll right"><ChevronRight size={14} /></button></div>)}</div>
      )} <div ref={ref} className={SCROLL_CLASS + (isMobile ? " px-4" : "")}>{children}</div></div>
  );
}
export default function BrowseView({
  view, currentStation, isPlaying, isFavorite, onPlay, onToggleFav, onPrefetch, favorites,
  recent, onSelectGenre, onSelectCountry, onGoHome, userGenreOrder,
}: Props) {
  const { t, locale } = useLocale(); const countryChips = useMemo(() => getCountryChipsForLocale(locale), [locale]);
  const translatedGenreCategories = useMemo(() =>
      GENRE_CATEGORIES.map((category) => {
        const key = GENRE_LABEL_KEYS[category.id]; return key ? { ...category, label: t(key) } : category;
      }),
    [t],
  );
  // Reorder browse sections based on user listening stats
  const effectiveBrowseOrder = useMemo(() => {
    if (!userGenreOrder || userGenreOrder.length === 0) return BROWSE_ORDER; const defaultOrder = [...BROWSE_ORDER];
    // Map genre stats to category IDs (handle partial matches: "hip hop" → "hiphop")
    const GENRE_TO_CAT: Record<string, string> = { 'hip hop': 'hiphop', 'hip-hop': 'hiphop', 'lo-fi': 'lofi' };
    const boostedIds = new Set<string>(); const ordered: string[] = [];
    // Always keep trending first
    ordered.push('trending'); boostedIds.add('trending');
    for (const genre of userGenreOrder) {
      const catId = GENRE_TO_CAT[genre] ?? genre.replace(/[\s-]/g, '').toLowerCase();
      if (defaultOrder.includes(catId as typeof defaultOrder[number]) && !boostedIds.has(catId)) {
        ordered.push(catId); boostedIds.add(catId);
      }
    }
    // Append remaining in default order
    for (const id of defaultOrder) { if (!boostedIds.has(id)) ordered.push(id); }
    return ordered;
  }, [userGenreOrder]); const isMobile = useMediaQuery("(max-width: 768px)", { initializeWithValue: false, });
  const [stations, setStations] = useState<Station[]>([]);
  const [categorySections, setCategorySections] = useState<Record<string, Station[]>>({});
  const [failedCategories, setFailedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false); const [error, setError] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false); const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(0); const PAGE_SIZE = 20;
  const discoveryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Tracks whether the initial immediate play has fired for the current
  // discovery-mode session.  Reset when discovery mode is turned off.
  const discoveryFiredRef = useRef(false);
  // Live track scanning
  type LiveInfo = { status: 'loading' | 'loaded' | 'error'; track: { title: string; artist: string } | null };
  const [liveData, setLiveData] = useState<Record<string, LiveInfo>>({});
  const [scanEnabled, setScanEnabled] = useState(false); const [songFilter, setSongFilter] = useState("");
  const scanGenRef = useRef(0); const [genreChipsExpanded, setGenreChipsExpanded] = useState(false);
  const [countryChipsExpanded, setCountryChipsExpanded] = useState(false);
  const loadCategory = useCallback(async (catId: string, flags?: { cancelled: boolean }) => {
    const cat = translatedGenreCategories.find((c) => c.id === catId); if (!cat) return;
    try {
      let result: Station[];
      if (cat.id === "trending") {
        result = await trendingStations(15);
      } else if (cat.id === "local") { result = await localStations(15); } else if (cat.tag) {
        result = await stationsByTag(cat.tag, 15);
      } else return;
      if (!flags?.cancelled) {
        setCategorySections((prev) => ({ ...prev, [cat.id]: result }));
        setFailedCategories((prev) => {
          if (!prev.has(catId)) return prev; const next = new Set(prev); next.delete(catId); return next;
        });
      }
    } catch {
      if (!flags?.cancelled) {
        setFailedCategories((prev) => {
          if (prev.has(catId)) return prev; const next = new Set(prev); next.add(catId); return next;
        });
      }
    }
  }, [translatedGenreCategories]);
  useEffect(() => {
    setPage(0); setLiveData({}); setScanEnabled(false); setSongFilter(""); scanGenRef.current++;
  }, [view]);
  // Fetch ICY metadata for a single station, optionally guarded by a staleness check
  const fetchMeta = useCallback(async (s: Station, stale?: () => boolean) => {
    setLiveData(prev => ({ ...prev, [s.stationuuid]: { status: 'loading', track: null } }));
    try {
      const result = await fetchIcyMeta(s.url_resolved); if (stale?.()) return;
      const raw = result.streamTitle; const track = raw ? (parseTrack(raw, s.name) ?? null) : null;
      setLiveData(prev => ({ ...prev, [s.stationuuid]: { status: 'loaded', track } }));
    } catch {
      if (stale?.()) return; setLiveData(prev => ({ ...prev, [s.stationuuid]: { status: 'error', track: null } }));
    }
  }, []);
  const startScan = useCallback(async (stationsToScan: Station[], gen: number) => {
    const queue = [...stationsToScan]; const stale = () => scanGenRef.current !== gen;
    const worker = async () => { while (queue.length > 0 && !stale()) await fetchMeta(queue.shift()!, stale); };
    await Promise.all(Array.from({ length: 3 }, worker));
  }, [fetchMeta]); const peekStation = useCallback((station: Station) => fetchMeta(station), [fetchMeta]);
  useEffect(() => {
    let cancelled = false; const flags = { cancelled: false }; setError(null);
    if (view.mode !== "top") {
      // Search, genre, country modes — single list
      setLoading(true);
      const load = async () => {
        try {
          let result: Station[];
          switch (view.mode) {
            case "search": result = await searchStations(view.query); break;
            case "genre": result = await stationsByTag(view.tag); break;
            case "country": result = await stationsByCountry(view.countryQueryName); break; default: result = [];
          }
          if (!cancelled) setStations(result);
        } catch { if (!cancelled) setError("Failed to load stations"); } finally { if (!cancelled) setLoading(false); }
      }; load();
    } else {
      // Top view — progressively load categories (3 concurrent max)
      setLoading(false); setCategorySections({}); setFailedCategories(new Set());
      const CONCURRENCY = 3; const queue = [...effectiveBrowseOrder];
      const runBatch = async () => {
        while (queue.length > 0 && !flags.cancelled) {
          const batch = queue.splice(0, CONCURRENCY);
          await Promise.allSettled(batch.map(catId => loadCategory(catId, flags)));
        }
      }; runBatch();
    }
    return () => { cancelled = true; flags.cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, retryKey]);
  // All loaded category stations for discovery mode & station count in top view
  const allCategoryStations = useMemo(() => { return Object.values(categorySections).flat(); }, [categorySections]);
  const displayCount = view.mode === "top" ? allCategoryStations.length : stations.length;
  // Discovery mode: auto-play random station every 30s
  useEffect(() => {
    const pool = view.mode === "top" ? allCategoryStations : stations;
    if (!discoveryMode) { discoveryFiredRef.current = false; return; }
    if (pool.length > 0) {
      // Play a random station immediately the first time discovery mode
      // activates (or when stations finish loading after activation),
      // so the user doesn't wait 30s staring at a button they just pressed.
      if (!discoveryFiredRef.current) {
        discoveryFiredRef.current = true; const random = pool[Math.floor(Math.random() * pool.length)];
        if (random) onPlay(random);
      }
      discoveryRef.current = setInterval(() => {
        const random = pool[Math.floor(Math.random() * pool.length)]; if (random) onPlay(random);
      }, 30_000);
    }
    return () => { if (discoveryRef.current) clearInterval(discoveryRef.current); };
  }, [discoveryMode, stations, allCategoryStations, view.mode, onPlay]);
  const itemWidth = isMobile ? "w-[140px]" : "w-[160px]";
  const renderScrollStations = (list: Station[]) =>
    list.map((s) => (
      <div key={s.stationuuid} className={`snap-start shrink-0 ${itemWidth}`}><StationCard
          station={s}
          isCurrent={s.stationuuid === currentStation?.stationuuid}
          isPlaying={isPlaying && s.stationuuid === currentStation?.stationuuid}
          isFavorite={isFavorite(s.stationuuid)}
          onPlay={() => onPlay(s)}
          onToggleFav={() => onToggleFav(s)}
          onPrefetch={() => onPrefetch?.(s.url_resolved)} /></div>
    ));
  // Compute page stations here so they can be used in the scan effect
  const pageStations = useMemo(() => {
    return stations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [stations, page, PAGE_SIZE]);
  // Trigger scan when enabled or page changes (non-top modes only)
  useEffect(() => {
    if (!scanEnabled || view.mode === "top" || pageStations.length === 0) return;
    const gen = scanGenRef.current + 1; scanGenRef.current = gen; startScan(pageStations, gen);
    return () => { if (scanGenRef.current === gen) scanGenRef.current++; };
  }, [scanEnabled, pageStations, view.mode, startScan]);
  // Derived scan stats
  const scannedCount = pageStations.filter(s => liveData[s.stationuuid]?.status === 'loaded').length;
  const isScanning = scanEnabled && pageStations.some(s => liveData[s.stationuuid]?.status === 'loading');
  // Reset page synchronously during render when songFilter changes.
  // Using the "adjusting state during render" pattern avoids a one-frame
  // flash of empty results that the useEffect approach would cause.
  const [prevSongFilter, setPrevSongFilter] = useState(songFilter);
  if (songFilter !== prevSongFilter) { setPrevSongFilter(songFilter); setPage(0); }
  // Filter grid by song/artist when songFilter is active — paginated
  const allSongFilteredStations = useMemo(() => {
    const trimmed = songFilter.trim(); if (!trimmed) return []; const q = trimmed.toLowerCase();
    return stations.filter(s => {
      const live = liveData[s.stationuuid]; if (!live?.track) return false; const { title, artist } = live.track;
      return (title && title.toLowerCase().includes(q)) || (artist && artist.toLowerCase().includes(q));
    });
  }, [stations, songFilter, liveData]);
  const songFilteredStations = useMemo(() => {
    if (!songFilter.trim()) return pageStations;
    return allSongFilteredStations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  }, [allSongFilteredStations, pageStations, songFilter, page, PAGE_SIZE]);
  // Chip active states based on current view (chips trigger view changes, not local filters)
  const genreChipActive = (tag: string) => view.mode === "genre" && view.tag === tag;
  const countryChipActive = (countryCode: string) => view.mode === "country" && view.countryCode === countryCode;
  return (
    <div className="col-fill min-w-0 h-full">
      {/* Header */} <div className={`${isMobile ? "px-4" : "px-5"} pt-4 pb-3 shrink-0 flex-between`}>
        <div><h2 className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-white`}>{view.label}</h2>
          <p className="text-[12px] text-muted mt-0.5">
            {loading ? t("loadingStations") : t("stationCount", { count: displayCount })}</p></div><button
          onClick={() => setDiscoveryMode((d) => !d)}
          className={`flex-row-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${discoveryMode ? "bg-sys-purple/20 text-sys-purple border border-sys-purple/30" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr"}`}
          title={t("discoveryModeTitle")}
          aria-pressed={discoveryMode}
          aria-label={t("discoveryModeAria")}><Sparkles size={12} />
          {t("discovery")}{discoveryMode ? ` ${t("discoveryOn")}` : ""}</button></div>
      {/* Genre chips — wrapping, limited on mobile */}
      {(() => {
        const MOBILE_LIMIT = 7; const collapsed = isMobile && !genreChipsExpanded;
        const visibleGenres = collapsed ? translatedGenreCategories.slice(0, MOBILE_LIMIT) : translatedGenreCategories;
        return (
          <div className={`shrink-0 flex flex-wrap gap-1.5 ${isMobile ? "px-3" : "px-4"} pb-2`}><button
              onClick={() => onGoHome?.()}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== "genre" ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
            >{t("all")}</button> {visibleGenres.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onSelectGenre?.(cat)}
                aria-current={genreChipActive(cat.tag ?? cat.id) || undefined}
                className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${genreChipActive(cat.tag ?? cat.id) ? `bg-linear-to-r ${cat.gradient} text-white` : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
              >{cat.label}</button>
            ))}
            {collapsed && translatedGenreCategories.length > MOBILE_LIMIT && (
              <button
                onClick={() => setGenreChipsExpanded(true)}
                className="px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap text-white/50 bg-white/[0.06] hover:bg-white/10 transition-colors"
              >{t("seeMore")}</button>)}</div>
        );
      })()}
      {/* Country chips — wrapping, limited on mobile */}
      {(() => {
        const MOBILE_LIMIT = 7; const collapsed = isMobile && !countryChipsExpanded;
        const visibleCountries = collapsed ? countryChips.slice(0, MOBILE_LIMIT) : countryChips;
        return (
          <div className={`shrink-0 flex flex-wrap gap-1.5 ${isMobile ? "px-3" : "px-4"} pb-3`}><button
              onClick={() => onGoHome?.()}
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== "country" ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
            >{`🌐 ${t("allCountries")}`}</button> {visibleCountries.map((c) => (
              <button
                key={c.code}
                onClick={() => onSelectCountry?.(c.code, c.queryName, c.displayName)}
                aria-current={countryChipActive(c.code) || undefined}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${countryChipActive(c.code) ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
              ><span>{c.flag}</span><span>{c.displayName}</span></button>
            ))}
            {collapsed && countryChips.length > MOBILE_LIMIT && (
              <button
                onClick={() => setCountryChipsExpanded(true)}
                className="px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap text-white/50 bg-white/[0.06] hover:bg-white/10 transition-colors"
              >{t("seeMore")}</button>)}</div>
        );
      })()}
      {/* Content */} <div className={`app-body ${isMobile ? "px-0" : "px-4"} pb-4 overflow-y-auto`}>
        {loading && (
          <div className="flex-center-row py-16"><Loader2 size={24} className="text-dim animate-spin" /></div>
        )}
        {error && (
          <div className="flex-center-col gap-3 py-16"><Radio size={32} className="text-muted" />
            <p className="text-[13px] text-secondary">{t("failedToLoad")}</p><button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-1.5 rounded-lg bg-surface-3 text-[12px] font-medium text-secondary hover:text-white hover:bg-surface-4 transition-colors"
            >{t("retry")}</button></div>
        )}
        {!loading && !error && view.mode !== "top" && stations.length === 0 && (
          <div className="flex-center-col py-16"><Radio size={32} className="text-muted mb-2" />
            <p className="text-[13px] text-secondary">{t("noStationsFound")}</p></div>
        )}
        {!loading && !error && (
          <>
            {/* Category rows for top view */}
            {view.mode === "top" && (
              <>
                {/* Favorites row */}
                {favorites && favorites.length > 0 && (
                    <ScrollRow
                      title={t("favorites")}
                      icon={<Star size={14} className="text-sys-orange/70" />}
                      isMobile={isMobile}>{renderScrollStations(favorites)}</ScrollRow>
                )}
                {/* Recent stations row */}
                {recent && recent.length > 0 && (
                    <ScrollRow
                      title={t("recent")}
                      icon={<Clock size={14} className="text-blue-400/70" />}
                      isMobile={isMobile}>{renderScrollStations(recent)}</ScrollRow>
                )}
                {effectiveBrowseOrder.map((catId) => {
                  const cat = translatedGenreCategories.find((c) => c.id === catId); if (!cat) return null;
                  const catStations = categorySections[catId]; if (catStations?.length === 0) return null;
                  const icon = CATEGORY_ICONS[catId] ?? (
                    catStations
                      ? <span className={`inline-block w-2.5 h-2.5 rounded-full bg-linear-to-r ${cat.gradient}`} />
                      : <Music size={14} className="text-dim" />
                  );
                  return (
                    <ScrollRow key={catId} title={cat.label} icon={icon} isMobile={isMobile}>
                      {!catStations && failedCategories.has(catId) ? (
                        <div className={`snap-start shrink-0 ${itemWidth} h-45 rounded-xl bg-surface-2 flex-center-col gap-2`}>
                          <Radio size={18} className="text-muted" />
                          <p className="text-[11px] text-muted">{t("failedToLoadStations")}</p><button
                            onClick={() => loadCategory(catId)}
                            className="px-3 py-1 rounded-lg bg-surface-4 text-[11px] text-secondary hover:text-white hover:bg-surface-5 transition-colors"
                          >{t("retry")}</button></div>
                      ) : !catStations ? (Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`snap-start shrink-0 ${itemWidth} h-45 rounded-xl bg-surface-2 animate-pulse`} />
                        ))
                      ) : (renderScrollStations(catStations))}</ScrollRow>
                  );
                })}</>
            )}
            {/* Grid column for search / genre / country views — paginated */}
            {view.mode !== "top" && stations.length > 0 && (() => {
              const filterActive = !!songFilter.trim();
              const paginationSource = filterActive ? allSongFilteredStations : stations;
              const totalPages = Math.ceil(paginationSource.length / PAGE_SIZE);
              return (
                <>
                  {/* Scan now-playing bar */}
                  <div className={`flex items-center gap-2 mb-3 ${isMobile ? "px-3" : "px-0"}`}><button
                      onClick={() => setScanEnabled(v => !v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors shrink-0 ${
                        scanEnabled
                          ? "bg-sys-orange/20 text-sys-orange border border-sys-orange/30"
                          : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr"
                      }`}
                        title={t("scanNowPlaying")}><ScanSearch size={12} />
                        {isScanning ? t("scanningProgress", { current: scannedCount, total: pageStations.length })
                          : scannedCount > 0
                            ? t("nowPlayingProgress", { current: scannedCount, total: pageStations.length })
                            : t("scanNowPlaying")}</button>
                    {scanEnabled && (
                      <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-surface-2 border border-white/5 min-w-0">
                        <Music2 size={11} className="text-dim shrink-0" /> <input
                          type="text"
                          placeholder={t("filterBySong")}
                          value={songFilter}
                          onChange={e => setSongFilter(e.target.value)}
                          className="bg-transparent text-white placeholder:text-white/25 outline-none w-full min-w-0" />
                        {songFilter && (
                          <button onClick={() => setSongFilter("")} className="text-dim hover:text-white shrink-0">
                            <X size={11} /></button>)}</div>
                    )}
                    {scanEnabled && songFilter && (
                      <span className="text-[11px] text-dim shrink-0">
                        {t("stationCount", { count: allSongFilteredStations.length })}</span>)}</div>
                  {/* Station grid */}
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-2 px-3" : "grid-cols-4 px-0"} pb-4`}>
                    {(songFilter.trim() ? songFilteredStations : pageStations).map((s) => {
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
                          onPeek={!scanEnabled ? () => peekStation(s) : undefined} />
                      );
                    })}</div>
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2 pb-6"><button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === 0 ? "text-white/20 cursor-default" : "bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white"}`}
                      ><ChevronLeft size={14} />
                        {t("previous")}</button><span className="text-[12px] text-dim tabular-nums">
                        {t("pageFraction", { current: page + 1, total: totalPages })}</span><button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === totalPages - 1 ? "text-white/20 cursor-default" : "bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white"}`}
                      >
                        {t("next")} <ChevronRight size={14} /></button></div>)}</>
              );
            })()}</>
        )}</div></div>
  );
}
