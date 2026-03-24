/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  SlidersHorizontal,
  Maximize2,
  Star,
  Heart,
  Clock,
} from "lucide-react";
import type { Station, NowPlayingTrack, PlaybackStatus } from "../types";
import type { StreamQuality } from "../hooks/useRadio";
import AnimatedBars from "./AnimatedBars";
import { FerrofluidRenderer } from "@/lib/audio-visualizer/FerrofluidRenderer";
import { ErrorBoundary } from "./ErrorBoundary";
import UiImage from "@/components/common/UiImage";
import { stationInitials } from "../utils/formatUtils";

type Props = {
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

function NowPlayingBar({
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
}: Props) {
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const [imgError, setImgError] = useState(false);
  const coverUrlForReset = track?.artworkUrl ?? station?.favicon;

  // Reset error state when cover URL changes so new artwork gets a chance to load
  const [prevBarCoverUrl, setPrevBarCoverUrl] = useState(coverUrlForReset);
  if (coverUrlForReset !== prevBarCoverUrl) {
    setPrevBarCoverUrl(coverUrlForReset);
    setImgError(false);
  }

  const coverUrl = track?.artworkUrl ?? station?.favicon;
  const showFallback = !coverUrl || imgError;

  const statusAnnouncement = useMemo(() => {
    if (!station) return "No station selected";
    const trackInfo = track?.title
      ? track.artist ? `${track.artist}, ${track.title}` : track.title
      : station.name;
    if (isLoading) return `Loading ${trackInfo}`;
    if (isPlaying) return `Now playing: ${trackInfo}`;
    if (status === "error") return `Playback error: ${station.name}`;
    return `Paused: ${trackInfo}`;
  }, [station, track, isPlaying, isLoading, status]);

  const [firstTag, compactTags] = useMemo(() => {
    const tags = station?.tags?.split(",") ?? [];
    return [tags[0] ?? "", tags.slice(0, 2).join(" · ")];
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
      <div className="relative flex items-center justify-between gap-3 pr-4 pt-2 pb-2 min-h-20 shrink-0 safe-bottom safe-x" style={SAFE_AREA_STYLE}>
        {/* Play/Pause — 48px touch target */}
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
        </button>

        {/* Track info + LIVE indicator */}
        <div className="flex-1 min-w-0">
          {station ? (
            <>
              <p className="text-[13px] font-medium text-white truncate leading-tight">
                {track?.title || station.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {isPlaying && (
                  <>
                    <span className="dot-1.5 bg-red-500 animate-pulse shrink-0" />
                    <span className="text-[9px] font-semibold tracking-wider uppercase text-red-500 shrink-0">
                      LIVE
                    </span>
                  </>
                )}
                <span className="text-[11px] text-secondary truncate">
                  {track?.artist || compactTags || ""}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[13px] text-dim">No station selected</p>
          )}
        </div>

        {/* Action buttons — 44px touch targets */}
        <div className="flex items-center gap-0.5 shrink-0">
          {station && !theaterMode && (
            <button
              onClick={onToggleTheater}
              className="w-10 h-10 flex-center-row rounded-xl text-white/30 hover:text-white/50 transition-colors active:scale-95"
              title="Theater"
              aria-label="Theater mode"
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>

        {/* Fill iPhone safe-area inset below the bar without adding layout height */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-full glass-blur"
          style={{ height: "env(safe-area-inset-bottom, 0px)" }}
        />
      </div>
    );
  }

  return (
    <div className="flex-row-3 px-4 min-h-18 glass-blur border-t border-border-default shrink-0 safe-bottom safe-x">
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>
      {/* Station info */}
      <div className="flex-row-2.5 min-w-40">
        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-surface-2 flex-center-row">
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              <span className="text-white text-[10px] font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {station ? (
                  stationInitials(station.name) || (
                    <Radio size={14} className="text-white/60" />
                  )
                ) : (
                  <Radio size={14} className="text-white/60" />
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
        </div>
        {/* TODO replace upper img with next image */}
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white truncate">
            {station?.name || "Not Playing"}
          </p>
          <p className="text-[10px] text-secondary truncate">
            {track?.title
              ? track.artist
                ? `${track.artist} — ${track.title}`
                : track.title
              : firstTag}
          </p>
          {track?.album && (
            <p className="text-[9px] text-dim truncate">{track.album}</p>
          )}
        </div>
        {icyBitrate && (
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/50 shrink-0 self-center">
            {icyBitrate}kbps
          </span>
        )}
        {streamQuality && isPlaying && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 self-center ${
              streamQuality === 'good' ? 'bg-green-500' :
              streamQuality === 'fair' ? 'bg-yellow-500' :
              streamQuality === 'poor' ? 'bg-red-500' :
              'bg-gray-500'
            }`}
            title={`Stream: ${streamQuality}`}
            aria-label={`Stream quality: ${streamQuality}`}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex-row-0.5">
        <button
          onClick={onTogglePlay}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          className="w-8 h-8 flex-center-row rounded-full bg-surface-3 hover:bg-surface-5 text-white transition-colors disabled:opacity-30"
        >
          {isLoading ? (
            <div className="icon-md border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} className="ml-0.5" />
          )}
        </button>
      </div>

      {/* LIVE indicator + mini ferrofluid */}
      <div className="flex-1 flex-row-2 min-w-0 relative">
        {station && isPlaying && (
          <>
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none opacity-40">
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
              <span className="dot-2 bg-red-500 animate-pulse" />
              <span className="text-[10px] font-semibold tracking-wider uppercase text-red-500">
                LIVE
              </span>
              <AnimatedBars size="small" />
            </div>
          </>
        )}
      </div>

      {/* Toggles */}
      <div className="flex-row-0.5">
        {station && !theaterMode && (
          <button
            onClick={onToggleTheater}
            className="p-1.5 rounded-md transition-colors text-subtle hover:text-white/50"
            title="Theater Mode"
            aria-label="Theater mode"
          >
            <Maximize2 size={14} />
          </button>
        )}
        {onToggleFav && (
          <button
            onClick={onToggleFav}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={!!isFavorite}
            className={`p-1.5 rounded-md transition-colors ${isFavorite ? "text-sys-orange" : "text-subtle hover:text-white/50"}`}
            title="Favorita"
          >
            <Star size={14} className={isFavorite ? "fill-sys-orange" : ""} />
          </button>
        )}
        {onFavSong && (
          <button
            onClick={onFavSong}
            aria-label={songLiked ? 'Unlike song' : 'Like song'}
            aria-pressed={!!songLiked}
            className={`p-1.5 rounded-md transition-colors ${songLiked ? "text-pink-400" : "text-subtle hover:text-white/50"}`}
            title="Me gusta canción"
          >
            <Heart size={14} className={songLiked ? "fill-pink-400" : ""} />
          </button>
        )}
        {onCycleSleepTimer && (
          <button
            onClick={onCycleSleepTimer}
            className={`p-1.5 rounded-md transition-colors relative ${sleepTimerMin != null ? "text-sys-orange" : "text-subtle hover:text-white/50"}`}
            title={sleepTimerMin != null ? `Sleep in ${sleepTimerMin}m` : "Sleep Timer"}
            aria-label={sleepTimerMin != null ? `Sleep timer: ${sleepTimerMin} minutes remaining` : "Sleep Timer"}
          >
            <Clock size={14} />
            {sleepTimerMin != null && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold text-sys-orange leading-none">
                {sleepTimerMin}
              </span>
            )}
          </button>
        )}
        <button
          onClick={onToggleEq}
          aria-label="Toggle equalizer"
          className={`p-1.5 rounded-md transition-colors ${eqPresetActive ? "text-sys-orange" : showEq ? "text-sys-orange bg-surface-2" : "text-subtle hover:text-white/50"}`}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex-row-1 w-24 min-w-0 shrink-0 overflow-hidden ml-2">
        <button
          onClick={onToggleMute}
          aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
          aria-pressed={muted || volume === 0}
          className="p-1 text-muted hover:text-white/60 transition-colors shrink-0"
        >
          {muted || volume === 0 ? (
            <VolumeX size={14} />
          ) : (
            <Volume2 size={14} />
          )}
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

export default React.memo(NowPlayingBar);