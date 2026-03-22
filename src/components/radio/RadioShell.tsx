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
  Menu,
  X,
  Radio as RadioIcon,
  Music,
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
import { useAudioAnalyser, useAlbumArt } from "@/lib/audio-visualizer";
import { usePlaybackStore } from "@/lib/playbackStore";
import Sidebar from "./components/Sidebar";
import BrowseView from "./components/BrowseView";
import NowPlayingHero from "./components/NowPlayingHero";
import NowPlayingBar from "./components/NowPlayingBar";
import MobileLyricsReel from "./components/MobileLyricsReel";
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
  const [eqPreset, setEqPreset] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"discover" | "history" | "favorites">("discover");
  const [mobileDrawer, setMobileDrawer] = useState(false);
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

  // Close drawer / reset compact state on layout change
  useEffect(() => {
    if (layout === "pip") {
      setMobileDrawer(false);
      setMiniMode(false);
    }
    if (layout === "mobile") {
      setMobileDrawer(false);
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
      if (layout === "mobile") setMobileDrawer(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [radio.play, recent.add, layout],
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

  useEffect(() => {
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
      }
    };
    window.addEventListener("radio-command", handler);
    return () => window.removeEventListener("radio-command", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radio.station]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      )
        return;
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
          if (radio.station) favs.toggle(radio.station);
          break;
        case "Escape":
          setShowEq(false);
          setMobileDrawer(false);
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [radio, handleSkipNext, handleSkipPrev, favs]);

  const isSongLiked = enrichedTrack?.title
    ? favSongs.has(enrichedTrack.title, enrichedTrack.artist ?? "")
    : false;

  const handleToggleFav = useCallback(() => {
    if (radio.station) favs.toggle(radio.station);
  }, [radio.station, favs]);

  const handleFavSong = useCallback(() => {
    if (!enrichedTrack?.title || !radio.station) return;
    favSongs.toggle({
      title: enrichedTrack.title,
      artist: enrichedTrack.artist ?? "",
      album: enrichedTrack.album,
      artworkUrl: enrichedTrack.artworkUrl,
      itunesUrl: enrichedTrack.itunesUrl,
      stationName: radio.station.name,
      stationUuid: radio.station.stationuuid,
    });
  }, [enrichedTrack, radio.station, favSongs]);

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
    setTheaterMode(false);
    setMobileDrawer(false);
    setMobileSearchOpen(false);
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
    setMobileDrawer(false);
  }, []);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");

  const handleMobileSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (mobileSearchQuery.trim()) {
        handleSearch(mobileSearchQuery.trim());
      } else {
        handleGoHome();
      }
    },
    [mobileSearchQuery, handleSearch, handleGoHome],
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
    setMobileDrawer(false);
  }, []);

  const handleShowFavorites = useCallback(() => {
    setView({
      mode: "top",
      query: "",
      tag: "",
      country: "",
      label: "Favorites",
    });
    setTheaterMode(false);
    setMobileDrawer(false);
  }, []);

  const viewKey = `${view.mode}-${view.tag}-${view.query}-${view.country}`;

  const sidebarEl = (
    <Sidebar
      favorites={favs.favorites}
      recent={recent.recent}
      onSearch={handleSearch}
      onSelectGenre={handleSelectGenre}
      onPlayStation={handlePlay}
      onShowFavorites={handleShowFavorites}
      onRemoveRecent={recent.remove}
      onRemoveFavorite={favs.remove}
      currentUuid={radio.station?.stationuuid || null}
      onGoHome={handleGoHome}
    />
  );

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
          <div className="relative z-20 flex-shrink-0">
            {/* Top row: menu + title + actions */}
            <div className="flex items-center gap-3 px-4 pt-3 pb-2">
              <button
                onClick={() => setMobileDrawer((d) => !d)}
                className="w-10 h-10 flex-center-row rounded-xl bg-surface-2 hover:bg-surface-5 text-secondary active:scale-95 transition-transform flex-shrink-0"
              >
                {mobileDrawer ? <X size={20} /> : <Menu size={20} />}
              </button>
              <div className="flex-1 min-w-0" onClick={handleGoHome}>
                <div className="flex items-center gap-1.5">
                  <RadioIcon size={16} className="text-sys-orange flex-shrink-0" />
                  <span className="text-[15px] font-semibold text-white">Pulse</span>
                </div>
              </div>
              {radio.station && (
                <button
                  onClick={radio.station ? handleToggleFav : undefined}
                  className={`w-10 h-10 flex-center-row rounded-xl transition-colors active:scale-95 flex-shrink-0 ${radio.station && favs.has(radio.station.stationuuid) ? "text-sys-orange" : "text-white/30"}`}
                >
                  <Star size={20} className={radio.station && favs.has(radio.station.stationuuid) ? "fill-sys-orange" : ""} />
                </button>
              )}
            </div>
            {/* Search bar */}
            <form onSubmit={handleMobileSearchSubmit} className="px-4 pb-2">
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white/[0.06] border border-white/[0.06]">
                <Search size={16} className="text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search stations..."
                  value={mobileSearchQuery}
                  onChange={(e) => setMobileSearchQuery(e.target.value)}
                  className="bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none w-full"
                  data-radio-search
                />
              </div>
            </form>
          </div>
        )}

        {/* Drawer overlay */}
        <AnimatePresence>
          {mobileDrawer && (
            <>
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 z-30"
                onClick={() => setMobileDrawer(false)}
              />
              <motion.div
                key="drawer"
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="absolute left-0 top-0 bottom-0 z-40 w-[280px] max-w-[75vw] bg-[#0a0f1a] border-r border-border-default shadow-2xl overflow-y-auto"
              >
                {sidebarEl}
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
                />
              )}
              {radio.station && (
                <MobileLyricsReel
                  lyrics={lyrics}
                  loading={lyricsLoading}
                  currentTime={radio.currentTime}
                  artworkUrl={albumArt.artworkUrl}
                  fallbackUrl={radio.station.favicon}
                />
              )}
              {/* ── Mobile top nav tabs ── */}
              <div className="flex-shrink-0 px-4 pt-2 pb-2 flex gap-2">
                {([
                  { id: "discover" as const, label: "Discover", icon: <RadioIcon size={14} /> },
                  { id: "history" as const, label: "History", icon: <Clock size={14} /> },
                  { id: "favorites" as const, label: "Favorites", icon: <Heart size={14} /> },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all active:scale-95 ${activeTab === tab.id ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white/60 hover:bg-white/[0.04]"}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
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
        {/* Sidebar - hidden in mini mode and theater mode */}
        {!miniMode && !theaterMode && (
          <div style={{ width: 200, flexShrink: 0 }}>{sidebarEl}</div>
        )}

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
                {radio.station && (
                  <MobileLyricsReel
                    lyrics={lyrics}
                    loading={lyricsLoading}
                    currentTime={radio.currentTime}
                    artworkUrl={albumArt.artworkUrl}
                    fallbackUrl={radio.station.favicon}
                    variant="desktop"
                  />
                )}
                {/* ── Top nav tabs ── */}
                <div className="flex-shrink-0 px-4 pt-2 pb-1 flex gap-1">
                  {([
                    { id: "discover" as const, label: "Discover", icon: <RadioIcon size={13} /> },
                    { id: "history" as const, label: "History", icon: <Clock size={13} /> },
                    { id: "favorites" as const, label: "Favorites", icon: <Heart size={13} /> },
                  ]).map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${activeTab === tab.id ? "bg-surface-6 text-white" : "text-dim hover:text-white/60 hover:bg-surface-2"}`}
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
        />
      </div>
      {songDetailModal}
    </div>
  );
}
