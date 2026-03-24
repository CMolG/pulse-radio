/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import UiImage from "@/components/common/UiImage";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Minimize2,
  Maximize2,
  Radio as RadioIcon,
  Search,
  Clock,
  Heart,
  Star,
  Settings,
} from "lucide-react";
import type {
  Station,
  ViewState,
  BrowseCategory,
  WidgetPlaybackState,
  HistoryEntry,
  SongDetailData,
} from "./types";
import { STORAGE_KEYS } from "./constants";
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
import { saveToStorage } from "@/lib/storageUtils";
import { useLocale } from "@/context/LocaleContext";
import { COUNTRY_BY_CODE, isSovereignCountryCode } from "@/lib/i18n/countries";
import { getCountryDisplayName } from "@/lib/i18n/countryChips";
import type { MessageKey } from "@/lib/i18n/messages";

type LayoutMode = "desktop" | "mobile" | "pip";

const GENRE_LABEL_KEYS: Record<string, MessageKey> = {
  trending: "genreTrending",
  pop: "genrePop",
  rock: "genreRock",
  jazz: "genreJazz",
  classical: "genreClassical",
  electronic: "genreElectronic",
  hiphop: "genreHiphop",
  country: "genreCountry",
  ambient: "genreAmbient",
  lofi: "genreLofi",
  news: "genreNews",
  latin: "genreLatin",
  metal: "genreMetal",
  local: "genreLocal",
  world: "genreWorld",
};

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number }>(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 800,
    h: typeof window !== 'undefined' ? window.innerHeight : 600,
  }));
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width <= 0 || height <= 0) return; // ignore detached/hidden elements
      setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

type RadioShellProps = {
  isPip?: boolean;
  initialCountryCode?: string;
};

export default function RadioShell({ isPip: isPipProp, initialCountryCode }: RadioShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useLocale();

  const layout: LayoutMode = isPipProp
    ? "pip"
    : containerSize.w <= 640
      ? "mobile"
      : "desktop";

  const radio = useRadio();
  const eq = useEqualizer();
  const { track, icyBitrate } = useStationMeta(radio.station, radio.status === "playing");
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
  useWakeLock(radio.status === "playing");
  const analyser = useAudioAnalyser({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
  });
  const bgAudio = useAudioReactiveBackground(analyser.meterRef, radio.status === "playing");
  const albumArt = useAlbumArt(track?.title ?? null, track?.artist ?? null);
  const usageStats = useStats();

  const enrichedTrack = useMemo(() => {
    if (!track) return null;
    return {
      ...track,
      album: track.album || albumArt.albumName || undefined,
      artworkUrl: track.artworkUrl || albumArt.artworkUrl || undefined,
      itunesUrl: albumArt.itunesUrl || undefined,
      durationMs: albumArt.durationMs || undefined,
      genre: albumArt.genre || undefined,
      releaseDate: albumArt.releaseDate || undefined,
      trackNumber: albumArt.trackNumber || undefined,
      trackCount: albumArt.trackCount || undefined,
    };
  }, [track, albumArt.albumName, albumArt.artworkUrl, albumArt.itunesUrl, albumArt.durationMs, albumArt.genre, albumArt.releaseDate, albumArt.trackNumber, albumArt.trackCount]);

  const songHistory = useHistory(
    radio.station?.name,
    radio.station?.stationuuid,
    enrichedTrack,
  );

  // Track listen time for stats (every 5 seconds while playing)
  const lastTickRef = useRef(Date.now());
  useEffect(() => {
    if (radio.status !== 'playing' || !radio.station) {
      lastTickRef.current = Date.now();
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      const delta = now - lastTickRef.current;
      lastTickRef.current = now;
      if (radio.station) {
        usageStats.tickListenTime(radio.station.stationuuid, radio.station.name, delta);
      }
    }, 5000);
    lastTickRef.current = Date.now();
    return () => clearInterval(interval);
  }, [radio.status, radio.station, usageStats]);

  // Record song play when a new track starts
  const lastRecordedTrackRef = useRef<string | null>(null);
  useEffect(() => {
    if (!enrichedTrack?.title || !enrichedTrack?.artist) return;
    const key = `${enrichedTrack.title}|||${enrichedTrack.artist}`;
    if (key === lastRecordedTrackRef.current) return;
    lastRecordedTrackRef.current = key;
    usageStats.recordSongPlay(
      enrichedTrack.title,
      enrichedTrack.artist,
      enrichedTrack.genre,
      enrichedTrack.artworkUrl,
    );
  }, [enrichedTrack?.title, enrichedTrack?.artist, enrichedTrack?.genre, enrichedTrack?.artworkUrl, usageStats]);

  const [showEq, setShowEq] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
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
      if (duckOrigVolRef.current === null) {
        duckOrigVolRef.current = audio.volume;
      }
      audio.volume = duckOrigVolRef.current * 0.4;
      duckTimerRef.current = setTimeout(() => {
        if (audio && duckOrigVolRef.current !== null) {
          audio.volume = duckOrigVolRef.current;
        }
        duckOrigVolRef.current = null;
        duckTimerRef.current = null;
      }, 400);
    }
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, [radio.audioRef]);
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "history" | "favorites">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongDetailData | null>(
    null,
  );
  const [view, setView] = useState<ViewState>(() => {
    const code = (initialCountryCode ?? "").toUpperCase();
    if (isSovereignCountryCode(code)) {
      const country = COUNTRY_BY_CODE[code];
      return {
        mode: "country",
        query: "",
        tag: "",
        countryCode: code,
        countryQueryName: country.name,
      label: getCountryDisplayName(locale, code),
      };
    }
    return {
      mode: "top",
      query: "",
      tag: "",
      countryCode: "",
      countryQueryName: "",
      label: t("topStations"),
    };
  });

  useEffect(() => {
    if (view.mode === "top" && view.label !== t("topStations")) {
      setView((prev) => ({
        ...prev,
        label: t("topStations"),
      }));
    }

    if (view.mode === "country" && view.countryCode) {
      const localized = getCountryDisplayName(locale, view.countryCode);
      if (localized && localized !== view.label) {
        setView((prev) => ({
          ...prev,
          label: localized,
        }));
      }
    }
  }, [locale, t, view.countryCode, view.label, view.mode]);

  useEffect(() => {
    const code = (initialCountryCode ?? "").toUpperCase();
    if (!isSovereignCountryCode(code)) return;
    if (view.mode === "country" && view.countryCode === code) return;
    const country = COUNTRY_BY_CODE[code];
    if (!country) return;

    setView({
      mode: "country",
      query: "",
      tag: "",
      countryCode: code,
      countryQueryName: country.name,
      label: getCountryDisplayName(locale, code),
    });
    setActiveTab("discover");
    setTheaterMode(false);
    setSearchQuery("");
  }, [initialCountryCode, locale, view.countryCode, view.mode]);

  // Reset compact state on layout change
  useEffect(() => {
    if (layout === "pip") {
      setMiniMode(false);
    }
  }, [layout]);

  // Track network connectivity for offline indicator
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
      state.setTrackInfo(
        enrichedTrack.title,
        enrichedTrack.artist,
        enrichedTrack.artworkUrl ?? albumArt.artworkUrl,
      );
    }
  }, [radio.status, radio.volume, radio.muted, radio.currentTime, enrichedTrack, albumArt.artworkUrl, pbStore]);

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      eq.connectSource(radio.audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  useEffect(() => {
    eq.setOutputVolume(radio.volume, radio.muted);
  }, [eq, radio.muted, radio.volume]);

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      analyser.connectAudio(radio.audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  const handlePlay = useCallback(
    (station: Station) => {
      radio.play(station);
      // Connect EQ and analyser within user gesture context so AudioContext
      // is created/resumed from a tap — required by mobile browsers.
      if (radio.audioRef.current) {
        eq.connectSource(radio.audioRef.current);
        analyser.connectAudio(radio.audioRef.current);
      }
      recent.add(station);
      stationQueue.setPlaying(station.stationuuid);
      setTheaterMode(true);
      // Prefetch next station in queue for seamless transition
      const nextIdx = stationQueue.queue.findIndex(s => s.stationuuid === station.stationuuid) + 1;
      if (nextIdx > 0 && nextIdx < stationQueue.queue.length) {
        radio.prefetchStream(stationQueue.queue[nextIdx].url_resolved);
      }
    },
    [radio, recent, stationQueue, eq, analyser],
  );

  // Auto-advance to next queued station on error, or failover to similar station
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
        // No queue entries — find a similar station by genre tag
        import('./services/radioApi').then(({ similarStations }) => {
          similarStations(radio.station!, 3).then(alts => {
            if (alts.length > 0 && !cancelled) {
              handlePlay(alts[0]);
            }
          }).catch(() => {});
        });
      }
    }
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.status]);

  const handleSkipNext = useCallback(() => {
    // Prefer queue if it has entries
    if (stationQueue.hasNext) {
      const next = stationQueue.skipToNext();
      if (next) { handlePlay(next); return; }
    }
    if (radio.station) {
      const next = favs.playNext(radio.station.stationuuid);
      if (next) handlePlay(next);
    }
  }, [radio.station, favs, stationQueue, handlePlay]);

  const handleSkipPrev = useCallback(() => {
    if (stationQueue.hasPrev) {
      const prev = stationQueue.skipToPrev();
      if (prev) { handlePlay(prev); return; }
    }
    if (radio.station) {
      const prev = favs.playPrev(radio.station.stationuuid);
      if (prev) handlePlay(prev);
    }
  }, [radio.station, favs, stationQueue, handlePlay]);

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

  const widgetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveWidgetState = useCallback(() => {
    const state: WidgetPlaybackState = {
      station: radio.station,
      status: radio.status,
      track: enrichedTrack,
      volume: radio.volume,
      updatedAt: Date.now(),
    };
    saveToStorage(STORAGE_KEYS.PLAYBACK, state);
  }, [radio.station, radio.status, enrichedTrack, radio.volume]);

  useEffect(() => {
    if (widgetSaveTimerRef.current) clearTimeout(widgetSaveTimerRef.current);
    widgetSaveTimerRef.current = setTimeout(saveWidgetState, 500);
    return () => {
      if (widgetSaveTimerRef.current) clearTimeout(widgetSaveTimerRef.current);
    };
  }, [saveWidgetState]);

  // Heartbeat: refresh updatedAt every 15s during playback so widgets
  // don't mark the state as stale during uninterrupted streams
  useEffect(() => {
    if (radio.status !== 'playing') return;
    const iv = setInterval(saveWidgetState, 15_000);
    return () => clearInterval(iv);
  }, [radio.status, saveWidgetState]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      switch (detail.action) {
        case "togglePlay":
          radio.togglePlay();
          break;
        case "play":
          if (detail.station) handlePlay(detail.station);
          break;
        case "stop":
          radio.stop();
          break;
        case "skipNext":
          handleSkipNext();
          break;
        case "skipPrev":
          handleSkipPrev();
          break;
        case "removeFavorite": {
          if (detail.stationuuid) favs.remove(detail.stationuuid);
          break;
        }
        case "setVolume": {
          if (typeof detail.volume === 'number') {
            radio.setVolume(detail.volume);
          }
          break;
        }
      }
    };
    window.addEventListener("radio-command", handler);
    return () => window.removeEventListener("radio-command", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Allow Escape even from inputs (to close panels/modals)
      if (isInput && e.key !== "Escape") return;

      // When EQ panel is open, suppress single-letter shortcuts that could
      // trigger unintended actions (theater, favorites, search, etc.).
      // Allow Escape, E (to close EQ), R (sync toggle), space, arrows, and M (volume).
      if (showEq) {
        const allowed = new Set([' ', 'Escape', 'e', 'E', 'r', 'R', 'ArrowUp', 'ArrowDown', 'm', 'M']);
        if (!allowed.has(e.key)) return;
      }

      // When song detail modal is open, let it handle its own Escape;
      // block all keys here to prevent shortcuts from firing behind the modal
      if (selectedSong) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          radio.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          handleSkipPrev();
          break;
        case "ArrowRight":
          e.preventDefault();
          handleSkipNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          radio.setVolume(Math.min(1, radio.volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          radio.setVolume(Math.max(0, radio.volume - 0.05));
          break;
        case "m":
        case "M":
          radio.toggleMute();
          break;
        case "n":
        case "N":
          handleSkipNext();
          break;
        case "p":
        case "P":
          handleSkipPrev();
          break;
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
          if (radio.station) {
            const wasFav = favs.has(radio.station.stationuuid);
            favs.toggle(radio.station);
            showToast(wasFav ? "Removed from favorites" : radio.station.name, "star");
          }
          break;
        case "Escape":
          // Priority: close topmost overlay first, then exit theater
          if (showShortcuts) setShowShortcuts(false);
          else if (showEq) setShowEq(false);
          else if (theaterMode) setTheaterMode(false);
          break;
        case "t":
        case "T":
          setTheaterMode(prev => !prev);
          break;
        case "e":
        case "E":
          setShowEq(prev => !prev);
          break;
        case "l":
        case "L":
          if (enrichedTrack?.title) {
            const wasLiked = favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? '');
            favSongs.toggle({
              title: enrichedTrack.title,
              artist: enrichedTrack.artist ?? '',
              album: enrichedTrack.album,
              artworkUrl: enrichedTrack.artworkUrl,
              itunesUrl: enrichedTrack.itunesUrl,
              durationMs: enrichedTrack.durationMs,
              genre: enrichedTrack.genre,
              releaseDate: enrichedTrack.releaseDate,
              trackNumber: enrichedTrack.trackNumber,
              trackCount: enrichedTrack.trackCount,
              stationName: radio.station?.name ?? '',
              stationUuid: radio.station?.stationuuid ?? '',
            });
            showToast(wasLiked ? "Song removed" : enrichedTrack.title, "heart");
          }
          break;
        case "r":
        case "R":
          if (realtimeLyrics) {
            realtimeLyrics.toggle();
          }
          break;
        case "z":
        case "Z":           // Z: cycle sleep timer
          sleepTimer.cycle();
          break;
        case "?":
          setShowShortcuts(prev => !prev);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [radio, handleSkipNext, handleSkipPrev, favs, favSongs, enrichedTrack, theaterMode, showEq, showShortcuts, selectedSong, sleepTimer, showToast, realtimeLyrics]);

  const isSongLiked = enrichedTrack?.title
    ? favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? "")
    : false;

  const handleToggleFav = useCallback(() => {
    if (!radio.station) return;
    const wasFav = favs.has(radio.station.stationuuid);
    favs.toggle(radio.station);
    showToast(wasFav ? "Removed from favorites" : radio.station.name, "star");
  }, [radio.station, favs, showToast]);

  const handleFavSong = useCallback(() => {
    if (!enrichedTrack?.title || !radio.station) return;
    const wasLiked = favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? "");
    favSongs.toggle({
      title: enrichedTrack.title,
      artist: enrichedTrack.artist ?? "",
      album: enrichedTrack.album,
      artworkUrl: enrichedTrack.artworkUrl,
      itunesUrl: enrichedTrack.itunesUrl,
      durationMs: enrichedTrack.durationMs,
      genre: enrichedTrack.genre,
      releaseDate: enrichedTrack.releaseDate,
      trackNumber: enrichedTrack.trackNumber,
      trackCount: enrichedTrack.trackCount,
      stationName: radio.station.name,
      stationUuid: radio.station.stationuuid,
    });
    showToast(wasLiked ? "Song removed" : enrichedTrack.title, "heart");
  }, [enrichedTrack, radio.station, favSongs, showToast]);

  const handleFavSongFromHistory = useCallback((entry: HistoryEntry) => {
    favSongs.toggle({
      title: entry.title,
      artist: entry.artist,
      album: entry.album,
      artworkUrl: entry.artworkUrl,
      itunesUrl: entry.itunesUrl,
      durationMs: entry.durationMs,
      genre: entry.genre,
      releaseDate: entry.releaseDate,
      trackNumber: entry.trackNumber,
      trackCount: entry.trackCount,
      stationName: entry.stationName,
      stationUuid: entry.stationUuid,
    });
  }, [favSongs]);

  const handleSearch = useCallback((query: string) => {
    const sanitized = query.trim();
    setView({
      mode: "search",
      query: sanitized,
      tag: "",
      countryCode: "",
      countryQueryName: "",
      label: t("searchResultLabel", { query: sanitized }),
    });
    setActiveTab("discover");
    setTheaterMode(false);
  }, [t]);

  const handleGoHome = useCallback(() => {
    setView({
      mode: "top",
      query: "",
      tag: "",
      countryCode: "",
      countryQueryName: "",
      label: t("topStations"),
    });
    setActiveTab("discover");
    setTheaterMode(false);
    setSearchQuery("");
    if (pathname !== "/") {
      router.push("/");
    }
  }, [pathname, router, t]);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        handleSearch(searchQuery.trim());
      } else {
        handleGoHome();
      }
    },
    [searchQuery, handleSearch, handleGoHome],
  );

  const handleSelectGenre = useCallback((cat: BrowseCategory) => {
    const key = GENRE_LABEL_KEYS[cat.id];
    setView({
      mode: "genre",
      query: "",
      tag: cat.tag || cat.id,
      countryCode: "",
      countryQueryName: "",
      label: key ? t(key) : cat.label,
    });
    setTheaterMode(false);
    setSearchQuery("");
  }, [t]);

  const handleSelectCountry = useCallback((countryCode: string, countryQueryName: string, countryDisplayName: string) => {
    setView({
      mode: "country",
      query: "",
      tag: "",
      countryCode,
      countryQueryName,
      label: countryDisplayName,
    });
    setTheaterMode(false);
    setSearchQuery("");
    if (pathname !== `/${countryCode}`) {
      router.push(`/${countryCode}`);
    }
  }, [pathname, router]);

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

  const songDetailModal = (
    <SongDetailModal
      song={selectedSong}
      onClose={() => setSelectedSong(null)}
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

  /* ─── PiP layout: always theater, no sidebar/lyrics ─── */
  if (layout === "pip") {
    return (
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
      >
        <ParallaxBackground
          faviconUrl={radio.station?.favicon}
          genre={radio.station?.tags?.split(",")[0]?.trim()?.toLowerCase()}
          audioAmplitude={bgAudio.amplitude}
        />
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
          <TheaterView
            station={
              radio.station ?? {
                name: t("discover"),
                url_resolved: "",
                stationuuid: "",
                favicon: "",
                tags: "",
                codec: "",
                bitrate: 0,
                country: "",
                countrycode: "",
                votes: 0,
              }
            }
            track={enrichedTrack}
            isPlaying={radio.status === "playing"}
            frequencyDataRef={analyser.frequencyDataRef}
            artworkUrl={albumArt.artworkUrl}
            icyBitrate={icyBitrate}
            onBack={() => {}}
            onFavSong={enrichedTrack?.title ? handleFavSong : undefined}
            isSongLiked={isSongLiked}
            lyrics={lyrics}
            currentTime={effectiveCurrentTime}
            activeLineOverride={realtimeLyrics?.activeLineIndex}
            syncConfidence={realtimeLyrics?.confidence}
            syncMode={realtimeLyrics?.status === 'listening' || realtimeLyrics?.status === 'recovering' ? 'realtime' : 'time'}
            compact
          />
        </div>
        <NowPlayingBar
          station={radio.station}
          track={enrichedTrack}
          status={radio.status}
          volume={radio.volume}
          muted={radio.muted}
          frequencyDataRef={analyser.frequencyDataRef}
          icyBitrate={icyBitrate}
          streamQuality={radio.streamQuality}
          onTogglePlay={radio.togglePlay}
          onSetVolume={radio.setVolume}
          onToggleMute={radio.toggleMute}
          onToggleEq={() => {}}
          showEq={false}
          theaterMode={true}
          sleepTimerMin={sleepTimer.remainingMin}
          onCycleSleepTimer={sleepTimer.cycle}
          compact
        />
        {songDetailModal}
        {shortcutsOverlay}
        {offlineBanner}
        <OnboardingModal />
      </div>
    );
  }

  /* ─── Mobile layout: drawer sidebar, overlay lyrics ─── */
  if (layout === "mobile") {
    return (
      <div
        ref={containerRef}
        className="relative h-full bg-[#0a0f1a] text-white overflow-hidden select-none"
      >
        <ParallaxBackground
          faviconUrl={radio.station?.favicon}
          genre={radio.station?.tags?.split(",")[0]?.trim()?.toLowerCase()}
          audioAmplitude={bgAudio.amplitude}
          landingMode={isLandingNavigation}
        />

        {/* Single scrollable area — content scrolls behind sticky header */}
        <div className="h-full overflow-y-auto relative z-10">
          {/* Sticky header — glassmorphism (content scrolls underneath) */}
          {!theaterMode && (
            <div data-testid="mobile-header" className="sticky top-0 z-30 safe-top border-b border-white/10" style={{ background: 'rgba(30, 32, 45, 0.62)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)' }}>
                <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                <button onClick={handleGoHome} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  <div className="relative w-5 h-5 flex-shrink-0">
                    <UiImage src="/favicon-32x32.png" alt="Pulse" className="object-contain" sizes="20px" priority />
                  </div>
                  <span className="text-[15px] font-semibold text-white">Pulse</span>
                </button>
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
                      radio.station && favs.has(radio.station.stationuuid)
                        ? t("removeFromFavorites")
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
              <TheaterView
                station={radio.station}
                track={enrichedTrack}
                isPlaying={radio.status === "playing"}
                frequencyDataRef={analyser.frequencyDataRef}
                artworkUrl={albumArt.artworkUrl}
                icyBitrate={icyBitrate}
                onBack={() => setTheaterMode(false)}
                onToggleFav={radio.station ? handleToggleFav : undefined}
                isFavorite={radio.station ? favs.has(radio.station.stationuuid) : false}
                onFavSong={enrichedTrack?.title ? handleFavSong : undefined}
                isSongLiked={isSongLiked}
                lyrics={lyrics}
                currentTime={effectiveCurrentTime}
                activeLineOverride={realtimeLyrics?.activeLineIndex}
                syncConfidence={realtimeLyrics?.confidence}
                syncMode={realtimeLyrics?.status === 'listening' || realtimeLyrics?.status === 'recovering' ? 'realtime' : 'time'}
                lyricsVariant="mobile"
              />
              </div>
              {/* Spacer for absolute bottom bar */}
              <div className="h-20 shrink-0" />
            </div>
          ) : (
            <div className="flex flex-col min-h-full pb-24">
              {radio.station && (
                <NowPlayingHero
                  station={radio.station}
                  track={enrichedTrack}
                  isPlaying={radio.status === "playing"}
                  frequencyDataRef={analyser.frequencyDataRef}
                  artworkUrl={albumArt.artworkUrl}
                  icyBitrate={icyBitrate}
                  onTheater={() => setTheaterMode(true)}
                />
              )}
              {/* ── Mobile top nav tabs + search ── */}
              <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-2">
                {([
                  { id: "discover" as const, label: t("discover"), icon: <RadioIcon size={14} /> },
                  { id: "history" as const, label: t("history"), icon: <Clock size={14} /> },
                  { id: "favorites" as const, label: t("favorites"), icon: <Heart size={14} /> },
                ]).map((tab) => (
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
                {activeTab === "discover" ? (
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
                    userGenreOrder={usageStats.genreOrder()}
                  />
                ) : activeTab === "history" ? (
                  <HistoryGridView
                    history={songHistory.history}
                    onRemove={songHistory.remove}
                    onClear={songHistory.clear}
                    onToggleFavSong={handleFavSongFromHistory}
                    isSongFavorite={favSongs.has}
                    onSelect={setSelectedSong}
                  />
                ) : (
                  <FavoriteSongsView
                    songs={favSongs.songs}
                    onRemove={favSongs.remove}
                    onClear={favSongs.clear}
                    onSelect={setSelectedSong}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* EQ panel overlay */}
        {showEq && (
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
        )}

        {/* Mobile settings panel */}
        <AnimatePresence>
          {showMobileSettings && (
            <MobileSettingsPanel
              onClose={() => setShowMobileSettings(false)}
              eq={eq}
              onPresetChange={setEqPreset}
              statsData={{
                topStations: usageStats.topStations(),
                topSongs: usageStats.topSongs(),
                topArtists: usageStats.topArtists(),
                topGenres: usageStats.topGenres(),
                totalListenMs: usageStats.stats.totalListenMs,
              }}
            />
          )}
        </AnimatePresence>

        {/* Toast notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 z-50 pointer-events-none"
              style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-[13px] font-medium shadow-lg whitespace-nowrap max-w-[260px] overflow-hidden">
                {toast.icon === "star"
                  ? <Star size={13} className="fill-sys-orange text-sys-orange flex-shrink-0" />
                  : <Heart size={13} className="fill-pink-400 text-pink-400 flex-shrink-0" />
                }
                <span className="truncate">{toast.msg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom bar — glassmorphism — absolute so content scrolls behind it */}
        <div data-testid="mobile-bottom-bar" className="absolute bottom-0 inset-x-0 z-20 border-t border-white/10" style={{ background: 'rgba(30, 32, 45, 0.62)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)' }}>
          <NowPlayingBar
            station={radio.station}
            track={enrichedTrack}
            status={radio.status}
            volume={radio.volume}
            muted={radio.muted}
            frequencyDataRef={analyser.frequencyDataRef}
            icyBitrate={icyBitrate}
            streamQuality={radio.streamQuality}
            onTogglePlay={radio.togglePlay}
            onSetVolume={radio.setVolume}
            onToggleMute={radio.toggleMute}
            onToggleEq={() => setShowEq((s) => !s)}
            onToggleTheater={() => setTheaterMode(true)}
            onToggleFav={radio.station ? handleToggleFav : undefined}
            onFavSong={enrichedTrack?.title ? handleFavSong : undefined}
            isFavorite={radio.station ? favs.has(radio.station.stationuuid) : false}
            songLiked={isSongLiked}
            eqPresetActive={eqPreset !== null}
            showEq={showEq}
            theaterMode={theaterMode}
            sleepTimerMin={sleepTimer.remainingMin}
            onCycleSleepTimer={sleepTimer.cycle}
            compact
          />
        </div>
        {songDetailModal}
        {shortcutsOverlay}
        {offlineBanner}
        <OnboardingModal />
      </div>
    );
  }

  /* ─── Desktop layout (default) ─── */
  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
    >
      <ParallaxBackground
        faviconUrl={radio.station?.favicon}
        genre={radio.station?.tags?.split(",")[0]?.trim()?.toLowerCase()}
        audioAmplitude={bgAudio.amplitude}
        landingMode={isLandingNavigation}
      />
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
                <TheaterView
                  station={radio.station}
                  track={enrichedTrack}
                  isPlaying={radio.status === "playing"}
                  frequencyDataRef={analyser.frequencyDataRef}
                  artworkUrl={albumArt.artworkUrl}
                  icyBitrate={icyBitrate}
                  onBack={() => setTheaterMode(false)}
                  onToggleFav={radio.station ? handleToggleFav : undefined}
                  isFavorite={radio.station ? favs.has(radio.station.stationuuid) : false}
                  onFavSong={enrichedTrack?.title ? handleFavSong : undefined}
                  isSongLiked={isSongLiked}
                  lyrics={lyrics}
                  currentTime={effectiveCurrentTime}
                  activeLineOverride={realtimeLyrics?.activeLineIndex}
                  syncConfidence={realtimeLyrics?.confidence}
                  syncMode={realtimeLyrics?.status === 'listening' || realtimeLyrics?.status === 'recovering' ? 'realtime' : 'time'}
                  lyricsVariant="desktop"
                />
              </motion.div>
            ) : !miniMode ? (
              <React.Fragment key="browse">
                {/* ── Pulse branding header ── */}
                <div className="shrink-0 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGoHome}
                      className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                    >
                      <div className="relative w-5 h-5">
                        <UiImage src="/favicon-32x32.png" alt="Pulse" className="object-contain" sizes="20px" priority />
                      </div>
                      <span className="text-[15px] font-semibold text-white">Pulse</span>
                    </button>
                    <div className="flex-1" />
                    <LanguageSelector />
                  </div>
                </div>
                {radio.station && (
                  <NowPlayingHero
                    station={radio.station}
                    track={enrichedTrack}
                    isPlaying={radio.status === "playing"}
                    frequencyDataRef={analyser.frequencyDataRef}
                    artworkUrl={albumArt.artworkUrl}
                    icyBitrate={icyBitrate}
                    onTheater={() => setTheaterMode(true)}
                  />
                )}
                {/* ── Top nav: tabs + search ── */}
                <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1">
                  {([
                    { id: "discover" as const, label: t("discover"), icon: <RadioIcon size={13} /> },
                    { id: "history" as const, label: t("history"), icon: <Clock size={13} /> },
                    { id: "favorites" as const, label: t("favorites"), icon: <Heart size={13} /> },
                  ]).map((tab) => (
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
                  {activeTab === "discover" ? (
                    <motion.div
                      key={viewKey}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 min-h-0"
                    >
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
                        userGenreOrder={usageStats.genreOrder()}
                      />
                    </motion.div>
                  ) : activeTab === "history" ? (
                    <motion.div
                      key="history-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 min-h-0 overflow-y-auto"
                    >
                      <HistoryGridView
                        history={songHistory.history}
                        onRemove={songHistory.remove}
                        onClear={songHistory.clear}
                        onToggleFavSong={handleFavSongFromHistory}
                        isSongFavorite={favSongs.has}
                        onSelect={setSelectedSong}
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="favorites-tab"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 min-h-0 overflow-y-auto"
                    >
                      <FavoriteSongsView
                        songs={favSongs.songs}
                        onRemove={favSongs.remove}
                        onClear={favSongs.clear}
                        onSelect={setSelectedSong}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </React.Fragment>
            ) : (
              radio.station && (
                <div key="mini" className="flex-row-4 px-6 py-4 flex-1">
                  {albumArt.artworkUrl ? (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <UiImage
                        src={albumArt.artworkUrl}
                        alt=""
                        className="object-cover"
                        sizes="56px"
                        loading="lazy"
                      />
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
      {showEq && (
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
      )}

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
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
        )}
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

        <NowPlayingBar
          station={radio.station}
          track={enrichedTrack}
          status={radio.status}
          volume={radio.volume}
          muted={radio.muted}
          frequencyDataRef={analyser.frequencyDataRef}
          icyBitrate={icyBitrate}
          streamQuality={radio.streamQuality}
          onTogglePlay={radio.togglePlay}
          onSetVolume={radio.setVolume}
          onToggleMute={radio.toggleMute}
          onToggleEq={() => setShowEq((s) => !s)}
          onToggleTheater={() => setTheaterMode(true)}
          onToggleFav={radio.station ? handleToggleFav : undefined}
          onFavSong={enrichedTrack?.title ? handleFavSong : undefined}
          isFavorite={radio.station ? favs.has(radio.station.stationuuid) : false}
          songLiked={isSongLiked}
          eqPresetActive={eqPreset !== null}
          showEq={showEq}
          theaterMode={theaterMode}
          sleepTimerMin={sleepTimer.remainingMin}
          onCycleSleepTimer={sleepTimer.cycle}
        />
      </div>
      {songDetailModal}
      {shortcutsOverlay}
      {offlineBanner}
      <OnboardingModal />
    </div>
  );
}
