/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState, useCallback, useEffect, useMemo, useRef, } from "react";
import UiImage from "@/components/common/UiImage";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Minimize2, Maximize2, Radio as RadioIcon, Search, Clock, Heart, Star, Settings } from "lucide-react";
import type { Station, ViewState, BrowseCategory, HistoryEntry, FavoriteSong, SongDetailData, NowPlayingTrack } from "./types";
import { GENRE_LABEL_KEYS } from "./constants";
import { useRadio } from "./hooks/useRadio";
import { useEqualizer } from "./hooks/useEqualizer";
import { useStationMeta } from "./hooks/useStationMeta";
import { useLyrics } from "./hooks/useLyrics";
import { useFavorites } from "./hooks/useFavorites";
import { useFavoriteSongs } from "./hooks/useFavoriteSongs";
import { useRecent } from "./hooks/useRecent";
import { useMediaSession } from "./hooks/useMediaSession";
import { useHistory } from "./hooks/useHistory";
import { useSleepTimer } from "./hooks/useSleepTimer";
import { useStationQueue } from "./hooks/useStationQueue";
import { useWakeLock } from "./hooks/useWakeLock";
import { useAudioReactiveBackground } from "./hooks/useAudioReactiveBackground";
import { useStats } from "./hooks/useStats";
import { useAudioAnalyser, useAlbumArt } from "@/lib/audio-visualizer";
import { usePlaybackStore } from "@/lib/playbackStore";
import BrowseView from "./components/BrowseView";
import NowPlayingHero from "./components/NowPlayingHero";
import NowPlayingBar from "./components/NowPlayingBar";
import EqPanel from "./components/EqPanel";
import ParallaxBackground from "./components/ParallaxBackground";
import TheaterView from "./components/TheaterView";
import HistoryGridView from "./components/HistoryGridView";
import FavoriteSongsView from "./components/FavoriteSongsView";
import SongDetailModal from "./components/SongDetailModal";
import { KeyboardShortcutsHelp } from "./components/KeyboardShortcutsHelp";
import LanguageSelector from "./components/LanguageSelector";
import MobileSettingsPanel from "./components/MobileSettingsPanel";
import OnboardingModal from "./components/OnboardingModal";
import { useLocale } from "@/context/LocaleContext";
import { COUNTRY_BY_CODE, isSovereignCountryCode } from "@/lib/i18n/countries";
import { getCountryDisplayName } from "@/lib/i18n/countryChips";

type LayoutMode = "desktop" | "mobile" | "pip";

function buildFavInput(t: NowPlayingTrack, s: Station): Omit<FavoriteSong, 'id' | 'timestamp'> {
  return { ...t, artist: t.artist ?? '', stationName: s.name, stationUuid: s.stationuuid };
}

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  useEffect(() => {
    const el = ref.current; if (!el) return;
    // Synchronous measurement replaces the window-based initial guess
    // one frame earlier than waiting for the ResizeObserver callback.
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setSize({ w: Math.round(rect.width), h: Math.round(rect.height) });
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return;
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el); return () => ro.disconnect();
  }, [ref]);
  return size;
}

type RadioShellProps = { isPip?: boolean; initialCountryCode?: string };

export default function RadioShell({ isPip: isPipProp, initialCountryCode }: RadioShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);
  const pathname = usePathname();
  const { t, locale } = useLocale();
  const layout: LayoutMode = isPipProp ? "pip" : containerSize.w <= 640 ? "mobile" : "desktop";
  const radio = useRadio();
  const eq = useEqualizer();
  const { track, icyBitrate } = useStationMeta(radio.station, radio.status === "playing");
  const { lyrics, effectiveCurrentTime, realtime: realtimeLyrics, } = useLyrics(track, radio.station?.name, {
    currentTime: radio.currentTime,
    enableRealtime: Boolean(track?.title),
    languageHint: locale === 'es' ? 'es' : 'en',
  });
  const favs = useFavorites();
  const favSongs = useFavoriteSongs();
  const recent = useRecent();
  const sleepTimer = useSleepTimer(radio.pause, radio.audioRef);
  const stationQueue = useStationQueue();
  useWakeLock(radio.status === "playing");
  const analyser = useAudioAnalyser({ fftSize: 2048, smoothingTimeConstant: 0.8, });
  const bgAudio = useAudioReactiveBackground(analyser.meterRef, radio.status === "playing");
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

  // Track listen time for stats (every 5 seconds while playing)
  const lastTickRef = useRef(Date.now());
  const { tickListenTime } = usageStats;
  useEffect(() => {
    if (radio.status !== 'playing' || !radio.station) { lastTickRef.current = Date.now(); return; }
    const interval = setInterval(() => {
      const now = Date.now(); const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (radio.station) tickListenTime(radio.station.stationuuid, radio.station.name, delta);
    }, 5000);
    lastTickRef.current = Date.now();
    return () => clearInterval(interval);
  }, [radio.status, radio.station, tickListenTime]);

  // Record song play when a new track starts
  const lastRecordedTrackRef = useRef<string | null>(null);
  const { recordSongPlay, updateSongMeta } = usageStats;
  useEffect(() => {
    if (!enrichedTrack?.title || !enrichedTrack?.artist) return;
    const key = `${enrichedTrack.title}|||${enrichedTrack.artist}`;
    if (key !== lastRecordedTrackRef.current) {
      lastRecordedTrackRef.current = key;
      recordSongPlay(enrichedTrack.title, enrichedTrack.artist, enrichedTrack.genre, enrichedTrack.artworkUrl,);
    } else {
      // Late-arriving metadata (artwork/genre from albumArt) — update without incrementing count
      updateSongMeta(enrichedTrack.title, enrichedTrack.artist, enrichedTrack.genre, enrichedTrack.artworkUrl,);
    }
  }, [enrichedTrack?.title, enrichedTrack?.artist, enrichedTrack?.genre, enrichedTrack?.artworkUrl, recordSongPlay, updateSongMeta]);

  const [showEq, setShowEq] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [toast, setToast] = useState<{ msg: string; icon: "star" | "heart"; key: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duckOrigVolRef = useRef<number | null>(null);
  const duckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, icon: "star" | "heart") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, icon, key: Date.now() });
    // Brief audio duck: lower volume for 400ms then restore
    const audio = radio.audioRef.current;
    if (audio && !audio.paused) {
      if (duckTimerRef.current) clearTimeout(duckTimerRef.current);
      // Only capture pre-duck volume if not already ducking
      if (duckOrigVolRef.current === null) duckOrigVolRef.current = audio.volume;
      audio.volume = duckOrigVolRef.current * 0.4;
      duckTimerRef.current = setTimeout(() => {
        if (audio && duckOrigVolRef.current !== null) audio.volume = duckOrigVolRef.current;
        duckOrigVolRef.current = null; duckTimerRef.current = null;
      }, 400);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, [radio.audioRef]);
  // Keep duck-restore target in sync if user changes volume while ducked.
  // Without this, the 400ms duck timer restores the stale pre-duck volume,
  // and useRadio's volume effect won't re-run (state hasn't changed).
  useEffect(() => {
    if (duckOrigVolRef.current !== null) duckOrigVolRef.current = radio.muted ? 0 : radio.volume;
  }, [radio.volume, radio.muted]);

  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "history" | "favorites">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongDetailData | null>(null);

  function mkView(mode: ViewState["mode"], label: string, overrides?: Partial<ViewState>): ViewState {
    return { mode, query: "", tag: "", countryCode: "", countryQueryName: "", label, ...overrides };
  }

  function countryView(code: string): ViewState {
    const country = COUNTRY_BY_CODE[code];
    return mkView("country", getCountryDisplayName(locale, code), { countryCode: code, countryQueryName: country?.name ?? "" });
  }

  const resetNav = useCallback((v: ViewState) => {
    setView(v); setActiveTab("discover");
    setTheaterMode(false); setSearchQuery("");
  }, []);

  const [view, setView] = useState<ViewState>(() => {
    const code = (initialCountryCode ?? "").toUpperCase();
    if (isSovereignCountryCode(code)) return countryView(code);
    return mkView("top", t("topStations"));
  });
  useEffect(() => {
    const newLabel = view.mode === "top" ? t("topStations")
      : view.mode === "country" && view.countryCode ? getCountryDisplayName(locale, view.countryCode)
      : null;
    if (newLabel && newLabel !== view.label) setView(prev => ({ ...prev, label: newLabel }));
  }, [locale, t, view.countryCode, view.label, view.mode]);

  useEffect(() => {
    const code = (initialCountryCode ?? "").toUpperCase();
    if (!isSovereignCountryCode(code) || !COUNTRY_BY_CODE[code]) return;
    if (view.mode === "country" && view.countryCode === code) return;
    resetNav(countryView(code));
  }, [initialCountryCode, locale, view.countryCode, view.mode, resetNav]);

  // Sync view state when the user navigates with browser back/forward.
  // pushState is used for country and home navigation but the browser's
  // popstate event is the only way to detect back/forward.
  useEffect(() => {
    const onPopState = () => {
      const segment = window.location.pathname.replace(/^\//, "").toUpperCase();

      if (!segment) { resetNav(mkView("top", t("topStations"))); return; }

      if (isSovereignCountryCode(segment) && COUNTRY_BY_CODE[segment]) resetNav(countryView(segment));
    };
    window.addEventListener("popstate", onPopState); return () => window.removeEventListener("popstate", onPopState);
  }, [locale, t, resetNav]);

  // Reset compact state on layout change
  useEffect(() => { if (layout === "pip") setMiniMode(false); }, [layout]);

  // Track network connectivity for offline indicator
  useEffect(() => {
    const goOnline = () => setIsOnline(true); const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Sync to shared playback store
  const pbStore = usePlaybackStore;
  useEffect(() => {
    const state = pbStore.getState();
    state.setSource("radio");
    state.setPlaying(radio.status === "playing");
    state.setVolume(radio.volume);
    state.setMuted(radio.muted);
    state.setCurrentTime(radio.currentTime);
    if (enrichedTrack) {
      state.setTrackInfo(enrichedTrack.title, enrichedTrack.artist, enrichedTrack.artworkUrl ?? albumArt.artworkUrl,);
    }
  }, [radio.status, radio.volume, radio.muted, radio.currentTime, enrichedTrack, albumArt.artworkUrl, pbStore]);

  const { setOutputVolume, connectSource: eqConnectSource } = eq;

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      eqConnectSource(radio.audioRef.current); analyser.connectAudio(radio.audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  // Keep EQ outputGain at unity — audio.volume already handles user volume.
  // Previously this forwarded radio.volume/muted, causing volume² (quadratic).
  useEffect(() => { setOutputVolume(1, false); }, [setOutputVolume]);

  // Ref holds fresh deps so handlePlay can use [] and remain referentially
  // stable.  Prevents child components receiving onPlay={handlePlay} from
  // re-rendering on every frame during playback.
  const handlePlayRef = useRef({ radio, recent, stationQueue, eqConnectSource, analyser });
  useEffect(() => {
    handlePlayRef.current = { radio, recent, stationQueue, eqConnectSource, analyser };
  }, [radio, recent, stationQueue, eqConnectSource, analyser]);

  const handlePlay = useCallback((station: Station) => {
      const { radio: r, recent: rec, stationQueue: sq, eqConnectSource: eqSrc, analyser: an } = handlePlayRef.current;
      // Pre-create audio element and set up the Web Audio graph BEFORE calling play().
      // On iOS Safari, createMediaElementSource() must be called BEFORE audio.src is
      // assigned and audio.play() is invoked — calling it after play() can result in
      // the audio being CORS-tainted and silenced in the Web Audio pipeline.
      // ensureAudio() is also needed so resumeAudioContext() inside play() finds the
      // AudioContext in the cache and can resume it within the same user-gesture context.
      const audio = r.ensureAudio();
      eqSrc(audio);
      an.connectAudio(audio);
      r.play(station);
      rec.add(station);
      sq.setPlaying(station.stationuuid);
      setTheaterMode(true);
      // Prefetch next station in queue for seamless transition
      const nextIdx = sq.queue.findIndex(s => s.stationuuid === station.stationuuid) + 1;
      if (nextIdx > 0 && nextIdx < sq.queue.length) r.prefetchStream(sq.queue[nextIdx].url_resolved);
    },
    [],
  );

  // Auto-advance to next queued station on error, or failover to similar station
  useEffect(() => {
    let cancelled = false;
    if (radio.status === 'error') {
      if (stationQueue.hasNext) {
        const next = stationQueue.skipToNext();
        if (next) { radio.play(next); recent.add(next); }
      } else if (radio.station) {
        // No queue entries — find a similar station by genre tag
        import('./services/radioApi').then(({ similarStations }) => {
          similarStations(radio.station!, 3).then(alts => {
            if (alts.length > 0 && !cancelled) handlePlay(alts[0]);
          }).catch(() => {});
        });
      }
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.status]);

  const skipDepsRef = useRef({ radio, favs, stationQueue });
  useEffect(() => { skipDepsRef.current = { radio, favs, stationQueue }; }, [radio, favs, stationQueue]);

  const handleSkipNext = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    // Prefer queue if it has entries
    if (sq.hasNext) {
      const next = sq.skipToNext();
      if (next) { handlePlay(next); return; }
    }
    if (r.station) { const next = f.playNext(r.station.stationuuid); if (next) handlePlay(next); }
  }, [handlePlay]);

  const handleSkipPrev = useCallback(() => {
    const { stationQueue: sq, radio: r, favs: f } = skipDepsRef.current;
    if (sq.hasPrev) {
      const prev = sq.skipToPrev();
      if (prev) { handlePlay(prev); return; }
    }
    if (r.station) { const prev = f.playPrev(r.station.stationuuid); if (prev) handlePlay(prev); }
  }, [handlePlay]);

  useMediaSession({
    station: radio.station,
    track: enrichedTrack,
    isPlaying: radio.status === "playing",
    onPlay: radio.resume,
    onPause: radio.pause,
    onNext: handleSkipNext,
    onPrev: handleSkipPrev,
    onStop: radio.stop,
    onSeekBackward: () => radio.seek(Math.max(0, radio.currentTime - 10)),
    onSeekForward: () => radio.seek(radio.currentTime + 10),
  });

  // Ref holds fresh state for keyboard handler so the event listener is
  // registered once — avoids ~60fps add/removeEventListener churn from
  // unstable deps (radio, favs, etc.) that change every render.
  const keydownRef = useRef({ radio, handleSkipNext, handleSkipPrev, favs, favSongs, enrichedTrack, theaterMode, showEq, showShortcuts, selectedSong, sleepTimer, showToast, realtimeLyrics });
  useEffect(() => {
    keydownRef.current = { radio, handleSkipNext, handleSkipPrev, favs, favSongs, enrichedTrack, theaterMode, showEq, showShortcuts, selectedSong, sleepTimer, showToast, realtimeLyrics };
  }, [radio, handleSkipNext, handleSkipPrev, favs, favSongs, enrichedTrack, theaterMode, showEq, showShortcuts, selectedSong, sleepTimer, showToast, realtimeLyrics]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { radio: r, handleSkipNext: skipNext, handleSkipPrev: skipPrev, favs: f, favSongs: fs, enrichedTrack: et, theaterMode: tm, showEq: eq, showShortcuts: sc, selectedSong: ss, sleepTimer: st, showToast: toast, realtimeLyrics: rl } = keydownRef.current;
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" || target.isContentEditable;

      // Allow Escape even from inputs (to close panels/modals)
      if (isInput && e.key !== "Escape") return;

      // When EQ panel is open, suppress single-letter shortcuts that could
      // trigger unintended actions (theater, favorites, search, etc.).
      // Allow Escape, E (to close EQ), R (sync toggle), space, arrows, and M (volume).
      if (eq) {
        const allowed = new Set([' ', 'Escape', 'e', 'E', 'r', 'R', 'ArrowUp', 'ArrowDown', 'm', 'M']);
        if (!allowed.has(e.key)) return;
      }

      // When song detail modal is open, let it handle its own Escape;
      // block all keys here to prevent shortcuts from firing behind the modal
      if (ss) return;

      switch (e.key) {
        case " ": e.preventDefault(); r.togglePlay(); break;
        case "ArrowLeft": e.preventDefault(); skipPrev(); break;
        case "ArrowRight": e.preventDefault(); skipNext(); break;
        case "ArrowUp": e.preventDefault(); r.setVolume(Math.min(1, r.volume + 0.05)); break;
        case "ArrowDown": e.preventDefault(); r.setVolume(Math.max(0, r.volume - 0.05)); break;
        case "m": case "M": r.toggleMute(); break;
        case "n": case "N": skipNext(); break;
        case "p": case "P": skipPrev(); break;
        case "f":
        case "F": {
          e.preventDefault();
          const searchInput =
            document.querySelector<HTMLInputElement>("[data-radio-search]") ??
            document.querySelector<HTMLInputElement>(".radio-search-input");
          if (searchInput) searchInput.focus();
          break;
        }
        case "s":
        case "S":
          if (r.station) {
            const wasFav = f.has(r.station.stationuuid);
            f.toggle(r.station);
            toast(wasFav ? "Removed from favorites" : r.station.name, "star");
          }
          break;
        case "Escape":
          // Priority: close topmost overlay first, then exit theater
          if (sc) setShowShortcuts(false);
          else if (eq) setShowEq(false);
          else if (tm) setTheaterMode(false);
          break;
        case "t": case "T": setTheaterMode(prev => !prev); break;
        case "e": case "E": setShowEq(prev => !prev); break;
        case "l":
        case "L":
          if (et?.title && r.station) {
            const wasLiked = fs.has(et.title, et.artist ?? '');
            fs.toggle(buildFavInput(et, r.station));
            toast(wasLiked ? "Song removed" : et.title, "heart");
          }
          break;
        case "r": case "R": if (rl) rl.toggle(); break;
        case "z": case "Z":           // Z: cycle sleep timer st.cycle(); break;
        case "?": setShowShortcuts(prev => !prev); break;
      }
    };
    window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const isSongLiked = enrichedTrack?.title ? favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? "") : false;
  const handleToggleFav = useCallback(() => {
    if (!radio.station) return;
    const wasFav = favs.has(radio.station.stationuuid);
    favs.toggle(radio.station);
    showToast(wasFav ? "Removed from favorites" : radio.station.name, "star");
  }, [radio.station, favs, showToast]);

  const handleFavSong = useCallback(() => {
    if (!enrichedTrack?.title || !radio.station) return;
    const wasLiked = favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? "");
    favSongs.toggle(buildFavInput(enrichedTrack, radio.station));
    showToast(wasLiked ? "Song removed" : enrichedTrack.title, "heart");
  }, [enrichedTrack, radio.station, favSongs, showToast]);

  const handleFavSongFromHistory = useCallback((entry: HistoryEntry) => {
    const wasLiked = favSongs.has(entry.title, entry.artist);
    const { id: _, timestamp: _t, ...input } = entry;
    favSongs.toggle(input);
    showToast(wasLiked ? "Song removed" : entry.title, "heart");
  }, [favSongs, showToast]);

  const handleSearch = useCallback((query: string) => {
    const sanitized = query.trim();
    setView(mkView("search", t("searchResultLabel", { query: sanitized }), { query: sanitized }));
    setActiveTab("discover"); setTheaterMode(false);
  }, [t]);

  const handleGoHome = useCallback(() => {
    resetNav(mkView("top", t("topStations")));
    if (pathname !== "/") window.history.pushState(null, "", "/");
  }, [pathname, t, resetNav]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) handleSearch(searchQuery.trim());
      else handleGoHome();
    },
    [searchQuery, handleSearch, handleGoHome],
  );

  const handleSelectGenre = useCallback((cat: BrowseCategory) => {
    const key = GENRE_LABEL_KEYS[cat.id];
    setView(mkView("genre", key ? t(key) : cat.label, { tag: cat.tag || cat.id }));
    setTheaterMode(false); setSearchQuery("");
  }, [t]);

  const handleSelectCountry = useCallback((countryCode: string, countryQueryName: string, countryDisplayName: string) => {
    setView(mkView("country", countryDisplayName, { countryCode, countryQueryName }));
    setTheaterMode(false); setSearchQuery("");
    const newPath = `/${countryCode}`;
    if (pathname !== newPath) window.history.pushState(null, "", newPath);
  }, [pathname]);

  const viewKey = `${view.mode}-${view.tag}-${view.query}-${view.countryCode}`;
  const isLandingNavigation = !theaterMode;
  const theaterAudioBadges = useMemo(() => {
    if (!theaterMode || !radio.station) return [] as string[];

    const badges: string[] = [];
      if (eq.noiseReductionMode !== 'off') badges.push(t("noiseReduction"));
      if (eq.normalizerEnabled) badges.push(t("audioNormalizer"));
      if (eq.enabled) badges.push(t("equalizer"));
      if (eq.enabled && eqPreset) badges.push(t("presetLabel", { name: eqPreset }));
      return badges;
  }, [eq.enabled, eq.noiseReductionMode, eq.normalizerEnabled, eqPreset, radio.station, theaterMode, t]);

  const selectedFavSong = selectedSong
    ? favSongs.songs.find(s => s.title === selectedSong.title && s.artist === selectedSong.artist) ?? null
    : null;
  const songDetailModal = (
    <SongDetailModal
      song={selectedSong}
      onClose={() => setSelectedSong(null)}
      onRemoveFromFavorites={selectedFavSong ? () => {
        favSongs.remove(selectedFavSong.id);
        setSelectedSong(null);
      } : undefined}
    />
  );

  const shortcutsOverlay = showShortcuts ? (
    <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />
  ) : null;

  const offlineBanner = !isOnline ? (
    <div className="fixed top-0 inset-x-0 z-[250] bg-yellow-600 text-white text-center text-[12px] font-medium py-1 select-none" role="alert">
      {t("offlineBanner")}
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
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[13px] font-medium shadow-lg whitespace-nowrap max-w-[260px] overflow-hidden">
        {toast.icon === "star"
          ? <Star size={13} className="fill-sys-orange text-sys-orange flex-shrink-0" />
          : <Heart size={13} className="fill-pink-400 text-pink-400 flex-shrink-0" />
        }
        <span className="truncate">{toast.msg}</span>
      </div>
    </motion.div>
  ) : null;

  const mkNavTabs = (sz: number) => [ { id: "discover" as const, label: t("discover"), icon: <RadioIcon size={sz} /> },
    { id: "history" as const, label: t("history"), icon: <Clock size={sz} /> },
    { id: "favorites" as const, label: t("favorites"), icon: <Heart size={sz} /> },
  ];
  const navTabs14 = useMemo(() => mkNavTabs(14), [t]);
  const navTabs13 = useMemo(() => mkNavTabs(13), [t]);
  const theaterBaseProps = {
    track: enrichedTrack,
    isPlaying: radio.status === "playing",
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

  /* ─── Shared tab content elements (used by mobile + desktop) ─── */
  const browseViewElement = (
    <BrowseView
      view={view}
      currentStation={radio.station}
      isPlaying={radio.status === "playing"}
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

  const parallaxElement = (
    <ParallaxBackground
      faviconUrl={radio.station?.favicon}
      genre={radio.station?.tags?.split(",")[0]?.trim()?.toLowerCase()}
      audioAmplitude={bgAudio.amplitude}
      landingMode={isLandingNavigation}
    />
  );

  const nowPlayingHeroElement = radio.station ? (
    <NowPlayingHero
      station={radio.station}
      track={enrichedTrack}
      isPlaying={radio.status === "playing"}
      frequencyDataRef={analyser.frequencyDataRef}
      artworkUrl={albumArt.artworkUrl}
      icyBitrate={icyBitrate}
      onTheater={() => setTheaterMode(true)}
    />
  ) : null;

  const sharedModals = (
    <>
      {songDetailModal}
      {shortcutsOverlay}
      {offlineBanner}
      <OnboardingModal />
    </>
  );

  const pulseLogoButton = (
    <button onClick={handleGoHome} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
      <div className="relative w-5 h-5 flex-shrink-0">
        <UiImage src="/favicon-32x32.png" alt="Pulse" className="object-contain" sizes="20px" priority />
      </div>
      <span className="text-[15px] font-semibold text-white">Pulse</span>
    </button>
  );

  const emptyStation = useMemo((): Station => ({ name: t("discover"), url_resolved: "", stationuuid: "", favicon: "", tags: "", codec: "", bitrate: 0, country: "", countrycode: "", votes: 0 }), [t]);
  const glassStyle = { background: 'rgba(30, 32, 45, 0.62)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)' } as const;

  /* ─── PiP layout: always theater, no sidebar/lyrics ─── */
  if (layout === "pip") {
    return (
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
      >
        {parallaxElement}
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
          <TheaterView {...theaterBaseProps} station={radio.station ?? emptyStation} onBack={() => {}} compact />
        </div>
        <NowPlayingBar {...nowPlayingBaseProps} onToggleEq={() => {}} showEq={false} theaterMode={true} compact />
        {sharedModals}
      </div>
    );
  }

  /* ─── Mobile layout: drawer sidebar, overlay lyrics ─── */
  if (layout === "mobile") {
    return (
      <div ref={containerRef} className="relative h-full bg-[#0a0f1a] text-white overflow-hidden select-none">
        {parallaxElement}

        {/* Single scrollable area — content scrolls behind sticky header */}
        <div className="h-full overflow-y-auto relative z-10">
          {/* Sticky header — glassmorphism (content scrolls underneath) */}
          {!theaterMode && (
            <div data-testid="mobile-header" className="sticky top-0 z-30 safe-top border-b border-white/10" style={glassStyle}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                {pulseLogoButton}
                  <div className="flex-1" />
                  <button
                    onClick={() => setShowMobileSettings(true)}
                    className="w-9 h-9 flex-center-row rounded-xl text-white/40 hover:text-white/60 transition-colors active:scale-95 flex-shrink-0"
                    title="Settings"
                    data-testid="mobile-settings-btn"
                  >
                    <Settings size={18} />
                  </button>
                  {radio.station && (
                  <button
                    onClick={radio.station ? handleToggleFav : undefined}
                    aria-label={
                      radio.station && favs.has(radio.station.stationuuid) ? t("removeFromFavorites")
                        : t("addToFavorites")
                    }
                    className={`w-9 h-9 flex-center-row rounded-xl transition-colors active:scale-95 flex-shrink-0 ${radio.station && favs.has(radio.station.stationuuid) ? "text-sys-orange" : "text-white/30"}`}
                  >
                    <Star size={18} className={radio.station && favs.has(radio.station.stationuuid) ? "fill-sys-orange" : ""} />
                  </button>
                )}
              </div>
            </div>
          )}

          {theaterMode && radio.station ? (
            <div className="h-full flex flex-col">
              <div className="flex-1 min-h-0">
              <TheaterView {...theaterFullProps} lyricsVariant="mobile" />
              </div>
              {/* Spacer for absolute bottom bar */}
              <div className="h-20 shrink-0" />
            </div>
          ) : (
            <div className="flex flex-col min-h-full pb-24">
              {nowPlayingHeroElement}
              {/* ── Mobile top nav tabs + search ── */}
              <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-2">
                {navTabs14.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all active:scale-95 flex-shrink-0 ${activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex-shrink-0 px-4 pb-2">
                <form onSubmit={handleSearchSubmit}>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.05]">
                    <Search size={13} className="text-white/30 flex-shrink-0" />
                    <input
                      type="search"
                      placeholder={t("searchStations")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label={t("searchStationsAria")}
                      className="bg-transparent text-white text-[13px] placeholder:text-white/25 outline-none w-full min-w-0"
                      data-radio-search
                    />
                  </div>
                </form>
              </div>
              <div className="flex-1 min-h-0">
                {activeTab === "discover" ? browseViewElement : activeTab === "history" ? historyViewElement : favsViewElement}
              </div>
            </div>
          )}
        </div>

        {/* EQ panel overlay */}
        {eqPanelElement}

        {/* Mobile settings panel */}
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
        </AnimatePresence>

        {/* Toast notification */}
        <AnimatePresence>
          {toastElement}
        </AnimatePresence>

        {/* Bottom bar — glassmorphism — absolute so content scrolls behind it */}
        <div data-testid="mobile-bottom-bar" className="absolute bottom-0 inset-x-0 z-20 border-t border-white/10" style={glassStyle}>
          <NowPlayingBar {...nowPlayingFullProps} compact />
        </div>
        {sharedModals}
      </div>
    );
  }

  /* ─── Desktop layout (default) ─── */
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
    >
      {parallaxElement}
      <div className="flex flex-1 min-h-0 relative z-10">
        {/* Main content */}
        <div className="col-fill min-w-0">
          <AnimatePresence mode="wait">
            {theaterMode && radio.station && !miniMode ? (
              <motion.div
                key="theater"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex-1 min-h-0"
              >
                <TheaterView {...theaterFullProps} lyricsVariant="desktop" />
              </motion.div>
            ) : !miniMode ? (
              <React.Fragment key="browse">
                {/* ── Pulse branding header ── */}
                <div className="shrink-0 px-5 py-3">
                  <div className="flex items-center gap-3">
                    {pulseLogoButton}
                    <div className="flex-1" />
                    <LanguageSelector />
                  </div>
                </div>
                {nowPlayingHeroElement}
                {/* ── Top nav: tabs + search ── */}
                <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1">
                  {navTabs13.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors flex-shrink-0 ${activeTab === tab.id ? "bg-surface-6 text-white" : "text-dim hover:text-white/60 hover:bg-surface-2"}`}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.id === "history" && songHistory.history.length > 0 && (
                        <span className="text-[9px] text-dim ml-0.5">{songHistory.history.length}</span>
                      )}
                      {tab.id === "favorites" && favSongs.songs.length > 0 && (
                        <span className="text-[9px] text-dim ml-0.5">{favSongs.songs.length}</span>
                      )}
                    </button>
                  ))}
                  {/* Search input — fills remaining space */}
                  <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0 ml-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-2 border border-white/[0.05]">
                      <Search size={12} className="text-dim flex-shrink-0" />
                      <input
                        type="search"
                        placeholder={t("searchStations")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label={t("searchStationsAria")}
                        className="bg-transparent text-white placeholder:text-white/25 outline-none w-full min-w-0"
                        data-radio-search
                      />
                    </div>
                  </form>
                </div>
                {/* ── Tab content ── */}
                <AnimatePresence mode="wait">
                  {(() => {
                    const [key, content, extra] = activeTab === "discover" ? [viewKey, browseViewElement, ""]
                      : activeTab === "history" ? ["history-tab", historyViewElement, " overflow-y-auto"]
                      : ["favorites-tab", favsViewElement, " overflow-y-auto"];
                    return (
                      <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className={`flex-1 min-h-0${extra}`}>
                        {content}
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
              </React.Fragment>
            ) : (
              radio.station && (
                <div key="mini" className="flex-row-4 px-6 py-4 flex-1">
                  {albumArt.artworkUrl ? (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <UiImage src={albumArt.artworkUrl} alt="" className="object-cover" sizes="56px" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-2 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-white truncate">
                      {enrichedTrack?.title || radio.station.name}
                    </p>
                    <p className="text-[12px] text-muted truncate">
                      {enrichedTrack?.artist || t("internetRadio")}
                    </p>
                  </div>
                </div>
              )
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* EQ panel overlay */}
      {eqPanelElement}

      {/* Toast notification */}
      <AnimatePresence>
        {toastElement}
      </AnimatePresence>

      {/* Bottom bar */}
      <div className="relative z-10">
        <div className="pointer-events-none absolute -top-14 inset-x-3 z-10 flex items-center justify-between gap-3">
          <div className="min-w-0 flex flex-col items-start gap-1.5 text-[10px] overflow-hidden">
            {theaterAudioBadges.length > 0 && (
              <div className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full" style={{ background: 'rgba(10, 15, 26, 0.7)', backdropFilter: 'blur(16px) saturate(1.3)', WebkitBackdropFilter: 'blur(16px) saturate(1.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-white/70 shrink-0">{t("autoAudioEnhancements")}</span>
                {theaterAudioBadges.map(label => (
                  <span key={label} className="px-2 py-0.5 rounded-full bg-sys-orange/20 border border-sys-orange/40 text-sys-orange font-medium whitespace-nowrap shrink-0">
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setMiniMode((m) => !m)}
            className="pointer-events-auto shrink-0 p-1 rounded bg-surface-2 hover:bg-surface-5 text-muted-hover"
            title={miniMode ? t("expand") : t("minimize")}
          >
            {miniMode ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
          </button>
        </div>

        <NowPlayingBar {...nowPlayingFullProps} />
      </div>
      {sharedModals}
    </div>
  );
}
