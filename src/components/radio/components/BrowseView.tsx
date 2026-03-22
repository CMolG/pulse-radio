/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { ChevronLeft, ChevronRight, Loader2, Radio, Sparkles, Zap, Music, MapPin, Heart, Clock } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import type { Station, ViewState, BrowseCategory } from "../types";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES, COUNTRY_DISPLAY, countryFlag } from "../constants";
import {
  searchStations,
  stationsByTag,
  stationsByCountry,
  trendingStations,
  localStations,
} from "../services/radioApi";
import StationCard from "./StationCard";

/** Order in which category sections appear on the home screen */
const BROWSE_ORDER = [
  'trending', 'pop', 'rock', 'jazz', 'classical', 'electronic',
  'hiphop', 'country', 'ambient', 'lofi', 'news', 'latin',
  'metal', 'local', 'world',
] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <Zap size={14} className="text-amber-400/70" />,
  local: <MapPin size={14} className="text-emerald-400/70" />,
};

type Props = {
  view: ViewState;
  currentStation: Station | null;
  isPlaying: boolean;
  isFavorite: (uuid: string) => boolean;
  onPlay: (station: Station) => void;
  onToggleFav: (station: Station) => void;
  favorites?: Station[];
  recent?: Station[];
  onSelectGenre?: (cat: BrowseCategory) => void;
  onSelectCountry?: (countryName: string) => void;
  onGoHome?: () => void;
};

const SCROLL_CLASS =
  "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]";

/* ── Scroll row with left/right arrow buttons (desktop only) ── */
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
    el.addEventListener("scroll", check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [check, children]);

  const scroll = (dir: -1 | 1) => {
    ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <div className={`mb-4 ${className ?? ""}`}>
      {title && (
        <div className={`flex items-center justify-between mb-2 ${isMobile ? "px-4" : ""}`}>
          <div className="flex-row-1.5">
            {icon}
            <h3 className="text-[13px] font-semibold text-soft">{title}</h3>
          </div>
          {!isMobile && (
            <div className="flex gap-1">
              <button
                onClick={() => scroll(-1)}
                className={`p-1 rounded-md transition-colors ${canLeft ? "text-secondary hover:text-white hover:bg-surface-3" : "text-white/10 cursor-default"}`}
                disabled={!canLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => scroll(1)}
                className={`p-1 rounded-md transition-colors ${canRight ? "text-secondary hover:text-white hover:bg-surface-3" : "text-white/10 cursor-default"}`}
                disabled={!canRight}
                aria-label="Scroll right"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
      <div ref={ref} className={SCROLL_CLASS + (isMobile ? " px-4" : "")}>
        {children}
      </div>
    </div>
  );
}

export default function BrowseView({
  view,
  currentStation,
  isPlaying,
  isFavorite,
  onPlay,
  onToggleFav,
  favorites,
  recent,
  onSelectGenre,
  onSelectCountry,
  onGoHome,
}: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)", {
    initializeWithValue: false,
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [categorySections, setCategorySections] = useState<Record<string, Station[]>>({});
  const [failedCategories, setFailedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;
  const discoveryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadCategory = useCallback(async (catId: string, flags?: { cancelled: boolean }) => {
    const cat = GENRE_CATEGORIES.find((c) => c.id === catId);
    if (!cat) return;
    try {
      let result: Station[];
      if (cat.id === "trending") {
        result = await trendingStations(15);
      } else if (cat.id === "local") {
        result = await localStations(15);
      } else if (cat.tag) {
        result = await stationsByTag(cat.tag, 15);
      } else {
        return;
      }
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
  }, []);

  useEffect(() => {
    setPage(0);
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    const flags = { cancelled: false };
    setError(null);

    if (view.mode !== "top") {
      // Search, genre, country modes — single list
      setLoading(true);
      const load = async () => {
        try {
          let result: Station[];
          switch (view.mode) {
            case "search":
              result = await searchStations(view.query);
              break;
            case "genre":
              result = await stationsByTag(view.tag);
              break;
            case "country":
              result = await stationsByCountry(view.country);
              break;
            default:
              result = [];
          }
          if (!cancelled) setStations(result);
        } catch {
          if (!cancelled) setError("Failed to load stations");
        } finally {
          if (!cancelled) setLoading(false);
        }
      };
      load();
    } else {
      // Top view — progressively load categories (3 concurrent max)
      setLoading(false);
      setCategorySections({});
      setFailedCategories(new Set());

      const CONCURRENCY = 3;
      const queue = [...BROWSE_ORDER];

      const runBatch = async () => {
        while (queue.length > 0 && !flags.cancelled) {
          const batch = queue.splice(0, CONCURRENCY);
          await Promise.allSettled(batch.map(catId => loadCategory(catId, flags)));
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

  // All loaded category stations for discovery mode & station count in top view
  const allCategoryStations = useMemo(() => {
    return Object.values(categorySections).flat();
  }, [categorySections]);

  const displayCount = view.mode === "top" ? allCategoryStations.length : stations.length;

  // Discovery mode: auto-play random station every 30s
  useEffect(() => {
    const pool = view.mode === "top" ? allCategoryStations : stations;
    if (discoveryMode && pool.length > 0) {
      discoveryRef.current = setInterval(() => {
        const random = pool[Math.floor(Math.random() * pool.length)];
        if (random) onPlay(random);
      }, 30_000);
    }
    return () => {
      if (discoveryRef.current) clearInterval(discoveryRef.current);
    };
  }, [discoveryMode, stations, allCategoryStations, view.mode, onPlay]);

  const itemWidth = isMobile ? "w-[140px]" : "w-[160px]";

  // Chip active states based on current view (chips trigger view changes, not local filters)
  const genreChipActive = (tag: string) => view.mode === "genre" && view.tag === tag;
  const countryChipActive = (name: string) => view.mode === "country" && view.country === name;

  return (
    <div className="col-fill min-w-0 h-full">
      {/* Header */}
      <div
        className={`${isMobile ? "px-4" : "px-5"} pt-4 pb-3 flex-shrink-0 flex-between`}
      >
        <div>
          <h2
            className={`${isMobile ? "text-base" : "text-lg"} font-semibold text-white`}
          >
            {view.label}
          </h2>
          <p className="text-[12px] text-muted mt-0.5">
            {loading ? "Loading…" : `${displayCount} stations`}
          </p>
        </div>
        <button
          onClick={() => setDiscoveryMode((d) => !d)}
          className={`flex-row-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${discoveryMode ? "bg-sys-purple/20 text-sys-purple border border-sys-purple/30" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr"}`}
          title="Auto-play a random station every 30 seconds"
          aria-pressed={discoveryMode}
          aria-label="Discovery mode"
        >
          <Sparkles size={12} />
          Discovery{discoveryMode ? " ON" : ""}
        </button>
      </div>

      {/* Genre chips — wrapping */}
      <div className={`flex-shrink-0 flex flex-wrap gap-1.5 ${isMobile ? "px-3" : "px-4"} pb-2`}>
        <button
          onClick={() => onGoHome?.()}
          className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== "genre" ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
        >
          All
        </button>
        {GENRE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelectGenre?.(cat)}
            aria-current={genreChipActive(cat.tag ?? cat.id) || undefined}
            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${genreChipActive(cat.tag ?? cat.id) ? `bg-gradient-to-r ${cat.gradient} text-white` : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Country chips — wrapping */}
      <div className={`flex-shrink-0 flex flex-wrap gap-1.5 ${isMobile ? "px-3" : "px-4"} pb-3`}>
        <button
          onClick={() => onGoHome?.()}
          className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${view.mode !== "country" ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
        >
          🌐 All
        </button>
        {COUNTRY_CATEGORIES.map((c) => (
          <button
            key={c.code}
            onClick={() => onSelectCountry?.(c.name)}
            aria-current={countryChipActive(c.name) || undefined}
            className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors ${countryChipActive(c.name) ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
          >
            <span>{countryFlag(c.code)}</span>
            <span>{COUNTRY_DISPLAY[c.code] ?? c.name}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className={`app-body ${isMobile ? "px-0" : "px-4"} pb-4 overflow-y-auto`}>
        {loading && (
          <div className="flex-center-row py-16">
            <Loader2 size={24} className="text-dim animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-center-col gap-3 py-16">
            <Radio size={32} className="text-muted" />
            <p className="text-[13px] text-secondary">{error}</p>
            <button
              onClick={() => setRetryKey((k) => k + 1)}
              className="px-4 py-1.5 rounded-lg bg-surface-3 text-[12px] font-medium text-secondary hover:text-white hover:bg-surface-4 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && view.mode !== "top" && stations.length === 0 && (
          <div className="flex-center-col py-16">
            <Radio size={32} className="text-muted mb-2" />
            <p className="text-[13px] text-secondary">No stations found</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Category rows for top view */}
            {view.mode === "top" && (
              <>
                {/* Favorites row */}
                {favorites && favorites.length > 0 && (
                  <ScrollRow
                    title="Favorites"
                    icon={<Heart size={14} className="text-pink-400/70" />}
                    isMobile={isMobile}
                  >
                    {favorites.map((s) => (
                      <div key={s.stationuuid} className={`snap-start flex-shrink-0 ${itemWidth}`}>
                        <StationCard
                          station={s}
                          isCurrent={s.stationuuid === currentStation?.stationuuid}
                          isPlaying={isPlaying && s.stationuuid === currentStation?.stationuuid}
                          isFavorite={isFavorite(s.stationuuid)}
                          onPlay={() => onPlay(s)}
                          onToggleFav={() => onToggleFav(s)}
                        />
                      </div>
                    ))}
                  </ScrollRow>
                )}

                {/* Recent stations row */}
                {recent && recent.length > 0 && (
                  <ScrollRow
                    title="Recent"
                    icon={<Clock size={14} className="text-blue-400/70" />}
                    isMobile={isMobile}
                  >
                    {recent.map((s) => (
                      <div key={s.stationuuid} className={`snap-start flex-shrink-0 ${itemWidth}`}>
                        <StationCard
                          station={s}
                          isCurrent={s.stationuuid === currentStation?.stationuuid}
                          isPlaying={isPlaying && s.stationuuid === currentStation?.stationuuid}
                          isFavorite={isFavorite(s.stationuuid)}
                          onPlay={() => onPlay(s)}
                          onToggleFav={() => onToggleFav(s)}
                        />
                      </div>
                    ))}
                  </ScrollRow>
                )}

                {BROWSE_ORDER.map((catId) => {
                  const cat = GENRE_CATEGORIES.find((c) => c.id === catId);
                  if (!cat) return null;

                  const catStations = categorySections[catId];

                  // Failed to load — show retry button
                  if (!catStations && failedCategories.has(catId)) {
                    return (
                      <ScrollRow
                        key={catId}
                        title={cat.label}
                        icon={
                          CATEGORY_ICONS[catId] ?? (
                            <Music size={14} className="text-dim" />
                          )
                        }
                        isMobile={isMobile}
                      >
                        <div className={`snap-start flex-shrink-0 ${itemWidth} h-[180px] rounded-xl bg-surface-2 flex-center-col gap-2`}>
                          <Radio size={18} className="text-muted" />
                          <p className="text-[11px] text-muted">Failed to load</p>
                          <button
                            onClick={() => loadCategory(catId)}
                            className="px-3 py-1 rounded-lg bg-surface-4 text-[11px] text-secondary hover:text-white hover:bg-surface-5 transition-colors"
                          >
                            Retry
                          </button>
                        </div>
                      </ScrollRow>
                    );
                  }

                  // Still loading — show skeleton placeholders
                  if (!catStations) {
                    return (
                      <ScrollRow
                        key={catId}
                        title={cat.label}
                        icon={
                          CATEGORY_ICONS[catId] ?? (
                            <Music size={14} className="text-dim" />
                          )
                        }
                        isMobile={isMobile}
                      >
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`snap-start flex-shrink-0 ${itemWidth} h-[180px] rounded-xl bg-surface-2 animate-pulse`}
                          />
                        ))}
                      </ScrollRow>
                    );
                  }

                  // No stations in this category
                  if (!catStations || catStations.length === 0) return null;

                  return (
                    <ScrollRow
                      key={catId}
                      title={cat.label}
                      icon={
                        CATEGORY_ICONS[catId] ?? (
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full bg-gradient-to-r ${cat.gradient}`}
                          />
                        )
                      }
                      isMobile={isMobile}
                    >
                      {catStations.map((s) => (
                        <div
                          key={s.stationuuid}
                          className={`snap-start flex-shrink-0 ${itemWidth}`}
                        >
                          <StationCard
                            station={s}
                            isPlaying={
                              isPlaying &&
                              currentStation?.stationuuid === s.stationuuid
                            }
                            isCurrent={
                              currentStation?.stationuuid === s.stationuuid
                            }
                            isFavorite={isFavorite(s.stationuuid)}
                            onPlay={() => onPlay(s)}
                            onToggleFav={() => onToggleFav(s)}
                          />
                        </div>
                      ))}
                    </ScrollRow>
                  );
                })}
              </>
            )}

            {/* Grid column for search / genre / country views — paginated */}
            {view.mode !== "top" && stations.length > 0 && (() => {
              const totalPages = Math.ceil(stations.length / PAGE_SIZE);
              const pageStations = stations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
              return (
                <>
                  <div className={`grid gap-3 ${isMobile ? "grid-cols-2 px-3" : "grid-cols-4 px-0"} pb-4`}>
                    {pageStations.map((s) => (
                      <StationCard
                        key={s.stationuuid}
                        station={s}
                        isPlaying={isPlaying && currentStation?.stationuuid === s.stationuuid}
                        isCurrent={currentStation?.stationuuid === s.stationuuid}
                        isFavorite={isFavorite(s.stationuuid)}
                        onPlay={() => onPlay(s)}
                        onToggleFav={() => onToggleFav(s)}
                      />
                    ))}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pt-2 pb-6">
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === 0 ? "text-white/20 cursor-default" : "bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white"}`}
                      >
                        <ChevronLeft size={14} />
                        Prev
                      </button>
                      <span className="text-[12px] text-dim tabular-nums">
                        {page + 1} / {totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-medium transition-colors ${page === totalPages - 1 ? "text-white/20 cursor-default" : "bg-surface-2 text-secondary hover:bg-surface-4 hover:text-white"}`}
                      >
                        Next
                        <ChevronRight size={14} />
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
