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
import { motion, AnimatePresence } from "motion/react";
import {
  Minimize2,
  Maximize2,
  Radio as RadioIcon,
  Search,
  Clock,
  Heart,
  Star,
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
import { saveToStorage } from "@/lib/storageUtils";

type LayoutMode = "desktop" | "mobile" | "pip";

function useContainerSize(ref: React.RefObject<HTMLDivElement | null>) {
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 800,
    h: 600,
  });
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

export default function RadioShell({ isPip: isPipProp }: { isPip?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerSize = useContainerSize(containerRef);

  const layout: LayoutMode = isPipProp
    ? "pip"
    : containerSize.w <= 640
      ? "mobile"
      : "desktop";

  const radio = useRadio();
  const eq = useEqualizer();
  const { track, icyBitrate } = useStationMeta(radio.station, radio.status === "playing");
  const { lyrics, loading: lyricsLoading, error: lyricsError, retry: retryLyrics } = useLyrics(track, radio.station?.name);
  const favs = useFavorites();
  const favSongs = useFavoriteSongs();
  const recent = useRecent();
  const sleepTimer = useSleepTimer(radio.pause);
  const analyser = useAudioAnalyser({
    fftSize: 2048,
    smoothingTimeConstant: 0.8,
  });
  const albumArt = useAlbumArt(track?.title ?? null, track?.artist ?? null);

  const enrichedTrack = useMemo(() => {
    if (!track) return null;
    return {
      ...track,
      album: track.album || albumArt.albumName || undefined,
      artworkUrl: track.artworkUrl || albumArt.artworkUrl || undefined,
      itunesUrl: albumArt.itunesUrl || undefined,
    };
  }, [track, albumArt.albumName, albumArt.artworkUrl, albumArt.itunesUrl]);

  const songHistory = useHistory(
    radio.station?.name,
    radio.station?.stationuuid,
    enrichedTrack,
  );

  const [showEq, setShowEq] = useState(false);
  const [miniMode, setMiniMode] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [toast, setToast] = useState<{ msg: string; icon: "star" | "heart"; key: number } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = useCallback((msg: string, icon: "star" | "heart") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ msg, icon, key: Date.now() });
    toastTimerRef.current = setTimeout(() => setToast(null), 2500);
  }, []);
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "history" | "favorites">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongDetailData | null>(
    null,
  );
  const [view, setView] = useState<ViewState>({
    mode: "top",
    query: "",
    tag: "",
    country: "",
    label: "Top Stations",
  });

  // Reset compact state on layout change
  useEffect(() => {
    if (layout === "pip") {
      setMiniMode(false);
    }
  }, [layout]);

  // Sync to shared playback store
  const pbStore = usePlaybackStore;
  useEffect(() => {
    pbStore.getState().setSource("radio");
    pbStore.getState().setPlaying(radio.status === "playing");
  }, [radio.status, pbStore]);

  useEffect(() => {
    pbStore.getState().setVolume(radio.volume);
    pbStore.getState().setMuted(radio.muted);
  }, [radio.volume, radio.muted, pbStore]);

  useEffect(() => {
    if (enrichedTrack) {
      pbStore
        .getState()
        .setTrackInfo(
          enrichedTrack.title,
          enrichedTrack.artist,
          enrichedTrack.artworkUrl ?? albumArt.artworkUrl,
        );
    }
  }, [enrichedTrack, albumArt.artworkUrl, pbStore]);

  useEffect(() => {
    pbStore.getState().setCurrentTime(radio.currentTime);
  }, [radio.currentTime, pbStore]);

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      eq.connectSource(radio.audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  useEffect(() => {
    if (radio.station && radio.audioRef.current) {
      analyser.connectAudio(radio.audioRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  const handlePlay = useCallback(
    (station: Station) => {
      radio.play(station);
      recent.add(station);
      setTheaterMode(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [radio.play, recent.add],
  );

  const handleSkipNext = useCallback(() => {
    if (radio.station) {
      const next = favs.playNext(radio.station.stationuuid);
      if (next) handlePlay(next);
    }
  }, [radio.station, favs, handlePlay]);

  const handleSkipPrev = useCallback(() => {
    if (radio.station) {
      const prev = favs.playPrev(radio.station.stationuuid);
      if (prev) handlePlay(prev);
    }
  }, [radio.station, favs, handlePlay]);

  useMediaSession({
    station: radio.station,
    track: enrichedTrack,
    isPlaying: radio.status === "playing",
    onPlay: radio.resume,
    onPause: radio.pause,
    onNext: () => {
      if (radio.station) {
        const next = favs.playNext(radio.station.stationuuid);
        if (next) handlePlay(next);
      }
    },
    onPrev: () => {
      if (radio.station) {
        const prev = favs.playPrev(radio.station.stationuuid);
        if (prev) handlePlay(prev);
      }
    },
    onStop: radio.stop,
    onSeekBackward: () => radio.seek(Math.max(0, radio.currentTime - 10)),
    onSeekForward: () => radio.seek(radio.currentTime + 10),
  });

  const widgetSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (widgetSaveTimerRef.current) clearTimeout(widgetSaveTimerRef.current);
    widgetSaveTimerRef.current = setTimeout(() => {
      const state: WidgetPlaybackState = {
        station: radio.station,
        status: radio.status,
        track: enrichedTrack,
        volume: radio.volume,
        updatedAt: Date.now(),
      };
      saveToStorage(STORAGE_KEYS.PLAYBACK, state);
    }, 500);
    return () => {
      if (widgetSaveTimerRef.current) clearTimeout(widgetSaveTimerRef.current);
    };
  }, [radio.station, radio.status, enrichedTrack, radio.volume]);

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
        case "skipNext": {
          if (radio.station) {
            const next = favs.playNext(radio.station.stationuuid);
            if (next) handlePlay(next);
          }
          break;
        }
        case "skipPrev": {
          if (radio.station) {
            const prev = favs.playPrev(radio.station.stationuuid);
            if (prev) handlePlay(prev);
          }
          break;
        }
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
      // Allow Escape, E (to close EQ), space, arrows, and M (volume).
      if (showEq) {
        const allowed = new Set([' ', 'Escape', 'e', 'E', 'ArrowUp', 'ArrowDown', 'm', 'M']);
        if (!allowed.has(e.key)) return;
      }

      // When song detail modal is open, only allow Escape to close it
      if (selectedSong) {
        if (e.key !== 'Escape') return;
      }

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
          setShowEq(false);
          if (theaterMode) setTheaterMode(false);
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
              stationName: radio.station?.name ?? '',
              stationUuid: radio.station?.stationuuid ?? '',
            });
            showToast(wasLiked ? "Song removed" : enrichedTrack.title, "heart");
          }
          break;
        case "z":
        case "Z":           // Z: cycle sleep timer
          sleepTimer.cycle();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [radio, handleSkipNext, handleSkipPrev, favs, favSongs, enrichedTrack, theaterMode, showEq, selectedSong, sleepTimer, showToast]);

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
      stationName: entry.stationName,
      stationUuid: entry.stationUuid,
    });
  }, [favSongs]);

  const handleSearch = useCallback((query: string) => {
    setView({
      mode: "search",
      query,
      tag: "",
      country: "",
      label: `Search: "${query}"`,
    });
    setActiveTab("discover");
    setTheaterMode(false);
  }, []);

  const handleGoHome = useCallback(() => {
    setView({
      mode: "top",
      query: "",
      tag: "",
      country: "",
      label: "Top Stations",
    });
    setActiveTab("discover");
    setTheaterMode(false);
    setSearchQuery("");
  }, []);

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
    setView({
      mode: "genre",
      query: "",
      tag: cat.tag || cat.id,
      country: "",
      label: cat.label,
    });
    setTheaterMode(false);
    setSearchQuery("");
  }, []);

  const handleSelectCountry = useCallback((countryName: string) => {
    setView({
      mode: "country",
      query: "",
      tag: "",
      country: countryName,
      label: countryName,
    });
    setTheaterMode(false);
    setSearchQuery("");
  }, []);

  const viewKey = `${view.mode}-${view.tag}-${view.query}-${view.country}`;

  const songDetailModal = (
    <SongDetailModal
      song={selectedSong}
      onClose={() => setSelectedSong(null)}
    />
  );

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
        />
        <div className="flex-1 min-h-0 relative z-10 flex flex-col">
          <TheaterView
            station={
              radio.station ?? {
                name: "Radio",
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
            lyricsLoading={lyricsLoading}
            currentTime={radio.currentTime}
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
      </div>
    );
  }

  /* ─── Mobile layout: drawer sidebar, overlay lyrics ─── */
  if (layout === "mobile") {
    return (
      <div
        ref={containerRef}
        className="flex flex-col h-full bg-[#0a0f1a] text-white overflow-hidden select-none relative"
      >
        <ParallaxBackground
          faviconUrl={radio.station?.favicon}
          genre={radio.station?.tags?.split(",")[0]?.trim()?.toLowerCase()}
        />

        {/* Mobile header */}
        {!theaterMode && (
          <div className="relative z-20 flex-shrink-0 safe-top">
            <div className="flex items-center gap-2 px-4 pt-3 pb-2">
              <button onClick={handleGoHome} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                <img src="/favicon-32x32.png" alt="Pulse" className="w-5 h-5 object-contain flex-shrink-0" />
                <span className="text-[15px] font-semibold text-white">Pulse</span>
              </button>
              <div className="flex-1" />
              {radio.station && (
                <button
                  onClick={radio.station ? handleToggleFav : undefined}
                  aria-label={radio.station && favs.has(radio.station.stationuuid) ? 'Remove from favorites' : 'Add to favorites'}
                  className={`w-9 h-9 flex-center-row rounded-xl transition-colors active:scale-95 flex-shrink-0 ${radio.station && favs.has(radio.station.stationuuid) ? "text-sys-orange" : "text-white/30"}`}
                >
                  <Star size={18} className={radio.station && favs.has(radio.station.stationuuid) ? "fill-sys-orange" : ""} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 min-h-0 relative z-10 overflow-y-auto">
          {theaterMode && radio.station ? (
            <div className="h-full">
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
                lyricsLoading={lyricsLoading}
                currentTime={radio.currentTime}
                lyricsVariant="mobile"
              />
            </div>
          ) : (
            <div className="flex flex-col min-h-full">
              {radio.station && (
                <NowPlayingHero
                  station={radio.station}
                  track={enrichedTrack}
                  isPlaying={radio.status === "playing"}
                  frequencyDataRef={analyser.frequencyDataRef}
                  artworkUrl={albumArt.artworkUrl}
                  icyBitrate={icyBitrate}
                  onTheater={() => setTheaterMode(true)}
                  lyrics={lyrics}
                  lyricsLoading={lyricsLoading}
                  currentTime={radio.currentTime}
                />
              )}
              {/* ── Mobile top nav tabs + search ── */}
              <div className="flex-shrink-0 px-4 pt-2 pb-2 flex items-center gap-2">
                {([
                  { id: "discover" as const, label: "Discover", icon: <RadioIcon size={14} /> },
                  { id: "history" as const, label: "History", icon: <Clock size={14} /> },
                  { id: "favorites" as const, label: "Favorites", icon: <Heart size={14} /> },
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
                <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.05]">
                    <Search size={13} className="text-white/30 flex-shrink-0" />
                    <input
                      type="search"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      aria-label="Search stations"
                      className="bg-transparent text-white placeholder:text-white/25 outline-none w-full min-w-0"
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
                    favorites={favs.favorites}
                    recent={recent.recent}
                    onSelectGenre={handleSelectGenre}
                    onSelectCountry={handleSelectCountry}
                    onGoHome={handleGoHome}
                  />
                ) : activeTab === "history" ? (
                  <div className="overflow-y-auto h-full">
                    <HistoryGridView
                      history={songHistory.history}
                      onRemove={songHistory.remove}
                      onClear={songHistory.clear}
                      onToggleFavSong={handleFavSongFromHistory}
                      isSongFavorite={favSongs.has}
                      onSelect={setSelectedSong}
                    />
                  </div>
                ) : (
                  <div className="overflow-y-auto h-full">
                    <FavoriteSongsView
                      songs={favSongs.songs}
                      onRemove={favSongs.remove}
                      onClear={favSongs.clear}
                      onSelect={setSelectedSong}
                    />
                  </div>
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
            customPresets={eq.customPresets}
            onSetGain={eq.setBandGain}
            onApplyPreset={eq.applyPreset}
            onToggleEnabled={eq.toggleEnabled}
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

        {/* Bottom bar */}
        <div className="relative z-20">
          <NowPlayingBar
            station={radio.station}
            track={enrichedTrack}
            status={radio.status}
            volume={radio.volume}
            muted={radio.muted}
            frequencyDataRef={analyser.frequencyDataRef}
            icyBitrate={icyBitrate}
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
                  lyricsLoading={lyricsLoading}
                  currentTime={radio.currentTime}
                  lyricsVariant="desktop"
                />
              </motion.div>
            ) : !miniMode ? (
              <React.Fragment key="browse">
                {/* ── Pulse branding header ── */}
                <div className="shrink-0 px-5 py-3">
                  <button
                    onClick={handleGoHome}
                    className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                  >
                    <img src="/favicon-32x32.png" alt="Pulse" className="w-5 h-5 object-contain" />
                    <span className="text-[15px] font-semibold text-white">Pulse</span>
                  </button>
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
                    lyrics={lyrics}
                    lyricsLoading={lyricsLoading}
                    currentTime={radio.currentTime}
                    lyricsVariant="desktop"
                  />
                )}
                {/* ── Top nav: tabs + search ── */}
                <div className="flex-shrink-0 px-4 pt-2 pb-1 flex items-center gap-1">
                  {([
                    { id: "discover" as const, label: "Discover", icon: <RadioIcon size={13} /> },
                    { id: "history" as const, label: "History", icon: <Clock size={13} /> },
                    { id: "favorites" as const, label: "Favorites", icon: <Heart size={13} /> },
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
                        placeholder="Search stations…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search stations"
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
                        favorites={favs.favorites}
                        recent={recent.recent}
                        onSelectGenre={handleSelectGenre}
                        onSelectCountry={handleSelectCountry}
                        onGoHome={handleGoHome}
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
                    <img
                      src={albumArt.artworkUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-surface-2 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-white truncate">
                      {enrichedTrack?.title || radio.station.name}
                    </p>
                    <p className="text-[12px] text-muted truncate">
                      {enrichedTrack?.artist || "Internet Radio"}
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
          customPresets={eq.customPresets}
          onSetGain={eq.setBandGain}
          onApplyPreset={eq.applyPreset}
          onToggleEnabled={eq.toggleEnabled}
          onSaveCustomPreset={eq.saveCustomPreset}
          onRemoveCustomPreset={eq.removeCustomPreset}
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
        <button
          onClick={() => setMiniMode((m) => !m)}
          className="absolute -top-8 right-3 z-10 p-1 rounded bg-surface-2 hover:bg-surface-5 text-muted-hover"
          title={miniMode ? "Expand" : "Minimize"}
        >
          {miniMode ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
        </button>

        <NowPlayingBar
          station={radio.station}
          track={enrichedTrack}
          status={radio.status}
          volume={radio.volume}
          muted={radio.muted}
          frequencyDataRef={analyser.frequencyDataRef}
          icyBitrate={icyBitrate}
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
    </div>
  );
}
