"use client";

import React, { useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Mic2,
  SlidersHorizontal,
  Maximize2,
  Star,
  Heart,
} from "lucide-react";
import type { Station, NowPlayingTrack, PlaybackStatus } from "../types";
import AnimatedBars from "./AnimatedBars";
import { FerrofluidRenderer } from "@/lib/audio-visualizer/FerrofluidRenderer";

function stationInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

type Props = {
  station: Station | null;
  track: NowPlayingTrack | null;
  status: PlaybackStatus;
  volume: number;
  muted: boolean;
  frequencyData?: Uint8Array | null;
  icyBitrate?: string | null;
  onTogglePlay: () => void;
  onSetVolume: (v: number) => void;
  onToggleMute: () => void;
  onToggleLyrics: () => void;
  onToggleEq: () => void;
  onToggleTheater?: () => void;
  onToggleFav?: () => void;
  onFavSong?: () => void;
  isFavorite?: boolean;
  songLiked?: boolean;
  eqPresetActive?: boolean;
  showLyrics: boolean;
  showEq: boolean;
  theaterMode?: boolean;
  compact?: boolean;
};

export default function NowPlayingBar({
  station,
  track,
  status,
  volume,
  muted,
  frequencyData,
  icyBitrate,
  onTogglePlay,
  onSetVolume,
  onToggleMute,
  onToggleLyrics,
  onToggleEq,
  onToggleTheater,
  onToggleFav,
  onFavSong,
  isFavorite,
  songLiked,
  eqPresetActive,
  showLyrics,
  showEq,
  theaterMode,
  compact,
}: Props) {
  const isPlaying = status === "playing";
  const isLoading = status === "loading";
  const [imgError, setImgError] = useState(false);
  const coverUrlForReset = track?.artworkUrl ?? station?.favicon;
  const lastBarCoverRef = React.useRef(coverUrlForReset);
  if (coverUrlForReset !== lastBarCoverRef.current) {
    lastBarCoverRef.current = coverUrlForReset;
    if (imgError) setImgError(false);
  }

  if (compact) {
    return (
      <div className="flex-row-2 px-3 h-12 glass-blur border-t border-border-default flex-shrink-0">
        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          disabled={!station}
          className="w-8 h-8 flex-center-row rounded-full bg-surface-3 hover:bg-surface-5 text-white transition-colors disabled:opacity-30 flex-shrink-0"
        >
          {isLoading ? (
            <div className="icon-md border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={14} />
          ) : (
            <Play size={14} className="ml-0.5" />
          )}
        </button>

        {/* Ferrofluid + LIVE */}
        <div className="flex-1 min-w-0 relative flex items-center">
          {station && isPlaying && (
            <>
              <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none opacity-30">
                <FerrofluidRenderer
                  frequencyData={frequencyData ?? null}
                  className="size-full"
                  blobCount={4}
                  colorPrimary="#1a1a2e"
                  colorSecondary="#16213e"
                  colorAccent="#0f3460"
                  sensitivity={1.0}
                  demo={!frequencyData}
                />
              </div>
              <div className="flex-row-1 relative z-10">
                <span className="dot-1.5 bg-red-500 animate-pulse" />
                <span className="text-[9px] font-semibold tracking-wider uppercase text-red-500">
                  LIVE
                </span>
              </div>
            </>
          )}
        </div>

        {/* Toggles */}
        <div className="flex-row-0.5 flex-shrink-0">
          {station && !theaterMode && (
            <button
              onClick={onToggleTheater}
              className="p-1 rounded-md text-subtle hover:text-white/50"
              title="Theater"
            >
              <Maximize2 size={13} />
            </button>
          )}
          {onToggleFav && (
            <button
              onClick={onToggleFav}
              className={`p-1 rounded-md transition-colors ${isFavorite ? "text-sys-orange" : "text-subtle hover:text-white/50"}`}
              title="Favorita"
            >
              <Star size={13} className={isFavorite ? "fill-sys-orange" : ""} />
            </button>
          )}
          {onFavSong && (
            <button
              onClick={onFavSong}
              className={`p-1 rounded-md transition-colors ${songLiked ? "text-pink-400" : "text-subtle hover:text-white/50"}`}
              title="Me gusta canción"
            >
              <Heart size={13} className={songLiked ? "fill-pink-400" : ""} />
            </button>
          )}
          <button
            onClick={onToggleLyrics}
            className={`p-1 rounded-md transition-colors ${showLyrics ? "text-sys-orange bg-surface-2" : "text-subtle hover:text-white/50"}`}
          >
            <Mic2 size={13} />
          </button>
          <button
            onClick={onToggleEq}
            className={`p-1 rounded-md transition-colors ${eqPresetActive ? "text-sys-orange" : showEq ? "text-sys-orange bg-surface-2" : "text-subtle hover:text-white/50"}`}
          >
            <SlidersHorizontal size={13} />
          </button>
        </div>

        {/* Volume */}
        <div className="flex-row-1 w-24 min-w-0 flex-shrink-0 overflow-hidden">
          <button
            onClick={onToggleMute}
            className="p-1 text-muted hover:text-white/60 transition-colors flex-shrink-0"
          >
            {muted || volume === 0 ? (
              <VolumeX size={13} />
            ) : (
              <Volume2 size={13} />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => onSetVolume(parseFloat(e.target.value))}
            className="flex-fill h-[3px] appearance-none bg-surface-3 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_3px_rgba(0,0,0,0.3)]"
          />
        </div>
      </div>
    );
  }

  const coverUrl = track?.artworkUrl ?? station?.favicon;
  const showFallback = !coverUrl || imgError;

  return (
    <div className="flex-row-3 px-4 h-14 glass-blur border-t border-border-default flex-shrink-0">
      {/* Station info */}
      <div className="flex-row-2.5 min-w-[160px]">
        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2 flex-center-row">
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
            <img
              src={coverUrl}
              alt=""
              className="size-full object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white truncate">
            {station?.name || "Not Playing"}
          </p>
          <p className="text-[10px] text-secondary truncate">
            {track?.title
              ? track.artist
                ? `${track.artist} — ${track.title}`
                : track.title
              : station?.tags?.split(",")[0] || ""}
          </p>
          {track?.album && (
            <p className="text-[9px] text-dim truncate">{track.album}</p>
          )}
        </div>
        {icyBitrate && (
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[9px] font-mono text-white/50 flex-shrink-0 self-center">
            {icyBitrate}kbps
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex-row-0.5">
        <button
          onClick={onTogglePlay}
          disabled={!station}
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
              <FerrofluidRenderer
                frequencyData={frequencyData ?? null}
                className="size-full"
                blobCount={6}
                colorPrimary="#1a1a2e"
                colorSecondary="#16213e"
                colorAccent="#0f3460"
                sensitivity={1.0}
                demo={!frequencyData}
              />
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
          >
            <Maximize2 size={14} />
          </button>
        )}
        {onToggleFav && (
          <button
            onClick={onToggleFav}
            className={`p-1.5 rounded-md transition-colors ${isFavorite ? "text-sys-orange" : "text-subtle hover:text-white/50"}`}
            title="Favorita"
          >
            <Star size={14} className={isFavorite ? "fill-sys-orange" : ""} />
          </button>
        )}
        {onFavSong && (
          <button
            onClick={onFavSong}
            className={`p-1.5 rounded-md transition-colors ${songLiked ? "text-pink-400" : "text-subtle hover:text-white/50"}`}
            title="Me gusta canción"
          >
            <Heart size={14} className={songLiked ? "fill-pink-400" : ""} />
          </button>
        )}
        <button
          onClick={onToggleLyrics}
          className={`p-1.5 rounded-md transition-colors ${showLyrics ? "text-sys-orange bg-surface-2" : "text-subtle hover:text-white/50"}`}
        >
          <Mic2 size={14} />
        </button>
        <button
          onClick={onToggleEq}
          className={`p-1.5 rounded-md transition-colors ${eqPresetActive ? "text-sys-orange" : showEq ? "text-sys-orange bg-surface-2" : "text-subtle hover:text-white/50"}`}
        >
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Volume */}
      <div className="flex-row-1 w-24 min-w-0 flex-shrink-0 overflow-hidden ml-2">
        <button
          onClick={onToggleMute}
          className="p-1 text-muted hover:text-white/60 transition-colors flex-shrink-0"
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
          value={muted ? 0 : volume}
          onChange={(e) => onSetVolume(parseFloat(e.target.value))}
          className="flex-fill h-[3px] appearance-none bg-surface-3 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_3px_rgba(0,0,0,0.3)]"
        />
      </div>
    </div>
  );
}
