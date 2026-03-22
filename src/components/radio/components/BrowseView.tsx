"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { ChevronLeft, ChevronRight, Loader2, Radio, Sparkles, Zap } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";
import type { Station, ViewState } from "../types";
import { GENRE_CATEGORIES, COUNTRY_CATEGORIES, countryFlag } from "../constants";
import {
  topStations,
  searchStations,
  stationsByTag,
  stationsByCountry,
  trendingStations,
  localStations,
} from "../services/radioApi";
import StationCard from "./StationCard";

type Props = {
  view: ViewState;
  currentStation: Station | null;
  isPlaying: boolean;
  isFavorite: (uuid: string) => boolean;
  onPlay: (station: Station) => void;
  onToggleFav: (station: Station) => void;
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
}: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)", {
    initializeWithValue: false,
  });
  const [stations, setStations] = useState<Station[]>([]);
  const [trendingList, setTrendingList] = useState<Station[]>([]);
  const [localList, setLocalList] = useState<Station[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discoveryMode, setDiscoveryMode] = useState(false);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const discoveryRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setGenreFilter(null);
    setCountryFilter(null);
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

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
            result = await topStations();
        }
        if (!cancelled) setStations(result);
      } catch {
        if (!cancelled) setError("Failed to load stations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    if (view.mode === "top") {
      trendingStations(10)
        .then((r) => {
          if (!cancelled) setTrendingList(r);
        })
        .catch(() => {});
      localStations(10)
        .then((r) => {
          if (!cancelled) setLocalList(r);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [view]);

  const filteredStations = useMemo(() => {
    let list = stations;
    if (genreFilter) {
      list = list.filter((s) =>
        s.tags?.toLowerCase().includes(genreFilter.toLowerCase()),
      );
    }
    if (countryFilter) {
      list = list.filter((s) =>
        s.country?.toLowerCase() === countryFilter.toLowerCase(),
      );
    }
    return list;
  }, [stations, genreFilter, countryFilter]);

  // Discovery mode: auto-play random station every 30s
  useEffect(() => {
    if (discoveryMode && filteredStations.length > 0) {
      discoveryRef.current = setInterval(() => {
        const random =
          filteredStations[Math.floor(Math.random() * filteredStations.length)];
        if (random) onPlay(random);
      }, 30_000);
    }
    return () => {
      if (discoveryRef.current) clearInterval(discoveryRef.current);
    };
  }, [discoveryMode, filteredStations, onPlay]);

  const itemWidth = isMobile ? "w-[140px]" : "w-[160px]";

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
            {loading ? "Loading…" : `${filteredStations.length} stations`}
          </p>
        </div>
        <button
          onClick={() => setDiscoveryMode((d) => !d)}
          className={`flex-row-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-colors ${discoveryMode ? "bg-sys-purple/20 text-sys-purple border border-sys-purple/30" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70 bdr"}`}
          title="Auto-play a random station every 30 seconds"
        >
          <Sparkles size={12} />
          Discovery{discoveryMode ? " ON" : ""}
        </button>
      </div>

      {/* Genre filter bar */}
      <div className={`pb-2 flex-shrink-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]`}>
        <div className={`flex gap-1.5 w-max ${isMobile ? "px-3" : "px-4"}`}>
          <button
            onClick={() => setGenreFilter(null)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 snap-start transition-colors ${!genreFilter ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
          >
            All
          </button>
          {GENRE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() =>
                setGenreFilter((prev) =>
                  prev === cat.tag ? null : (cat.tag ?? null),
                )
              }
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 snap-start transition-colors ${genreFilter === cat.tag ? `bg-gradient-to-r ${cat.gradient} text-white` : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Country filter bar */}
      <div className="pb-3 flex-shrink-0 overflow-x-auto overflow-y-hidden snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        <div className={`flex gap-1.5 w-max ${isMobile ? "px-3" : "px-4"}`}>
          <button
            onClick={() => setCountryFilter(null)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 snap-start transition-colors ${!countryFilter ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
          >
            🌐 All
          </button>
          {COUNTRY_CATEGORIES.map((c) => (
            <button
              key={c.code}
              onClick={() =>
                setCountryFilter((prev) =>
                  prev === c.name ? null : c.name,
                )
              }
              className={`px-3 py-1 rounded-full text-[11px] font-medium whitespace-nowrap flex-shrink-0 snap-start transition-colors ${countryFilter === c.name ? "bg-surface-6 text-white" : "bg-surface-2 text-dim hover:bg-surface-4 hover:text-white/70"}`}
            >
              {countryFlag(c.code)} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`app-body ${isMobile ? "px-0" : "px-4"} pb-4 overflow-y-auto`}>
        {loading && (
          <div className="flex-center-row py-16">
            <Loader2 size={24} className="text-dim animate-spin" />
          </div>
        )}

        {error && (
          <div className="flex-center-col py-16">
            <Radio size={32} className="text-muted mb-2" />
            <p className="text-[13px] text-secondary">{error}</p>
          </div>
        )}

        {!loading && !error && filteredStations.length === 0 && (
          <div className="flex-center-col py-16">
            <Radio size={32} className="text-muted mb-2" />
            <p className="text-[13px] text-secondary">No stations found</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Trending & Local sections for top view */}
            {view.mode === "top" && !genreFilter && !countryFilter && (
              <>
                <ScrollRow title="Trending" icon={<Zap size={14} className="text-amber-400/70" />} isMobile={isMobile}>
                  {trendingList.map((s) => (
                    <div key={s.stationuuid} className={`snap-start flex-shrink-0 ${itemWidth}`}>
                      <StationCard station={s} isPlaying={isPlaying && currentStation?.stationuuid === s.stationuuid} isCurrent={currentStation?.stationuuid === s.stationuuid} isFavorite={isFavorite(s.stationuuid)} onPlay={() => onPlay(s)} onToggleFav={() => onToggleFav(s)} />
                    </div>
                  ))}
                </ScrollRow>
                <ScrollRow title="Near You" icon={<Radio size={14} className="text-sys-orange/70" />} isMobile={isMobile}>
                  {localList.map((s) => (
                    <div key={s.stationuuid} className={`snap-start flex-shrink-0 ${itemWidth}`}>
                      <StationCard station={s} isPlaying={isPlaying && currentStation?.stationuuid === s.stationuuid} isCurrent={currentStation?.stationuuid === s.stationuuid} isFavorite={isFavorite(s.stationuuid)} onPlay={() => onPlay(s)} onToggleFav={() => onToggleFav(s)} />
                    </div>
                  ))}
                </ScrollRow>
                {(trendingList.length > 0 || localList.length > 0) && (
                  <div className={`flex-row-1.5 mb-2 mt-2 ${isMobile ? "px-4" : ""}`}>
                    <Radio size={14} className="text-dim" />
                    <h3 className="text-[13px] font-semibold text-soft">Top Stations</h3>
                  </div>
                )}
              </>
            )}
            <ScrollRow isMobile={isMobile}>
              {filteredStations.map((s) => (
                <div key={s.stationuuid} className={`snap-start flex-shrink-0 ${itemWidth}`}>
                  <StationCard station={s} isPlaying={isPlaying && currentStation?.stationuuid === s.stationuuid} isCurrent={currentStation?.stationuuid === s.stationuuid} isFavorite={isFavorite(s.stationuuid)} onPlay={() => onPlay(s)} onToggleFav={() => onToggleFav(s)} />
                </div>
              ))}
            </ScrollRow>
          </>
        )}
      </div>
    </div>
  );
}
