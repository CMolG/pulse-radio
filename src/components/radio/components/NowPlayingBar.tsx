'use client';
import React, { useState, useCallback, useMemo } from 'react';
import {
  Pause,
  Play,
  Maximize2,
  Radio as RadioIcon,
  Clock,
  Heart,
  Star,
  Sparkles,
  SlidersHorizontal,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Station, NowPlayingTrack, PlaybackStatus } from '../constants';
import { ErrorBoundary } from './ErrorBoundary';
import {
  LiquidGlassButton,
  UiImage,
  AnimatedBars,
  FerrofluidRenderer,
  stationInitials,
  shareContent,
  buildStationShareUrl,
  _SAFE_AREA_BOTTOM_STYLE,
} from '../RadioShell';
import type { StreamQuality } from '../RadioShell';

type NowPlayingBarProps = {
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
  effectsEnabled?: boolean;
  onToggleEffects?: () => void;
};
const SAFE_AREA_STYLE: React.CSSProperties = {
  paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))',
};
function _NowPlayingBar({
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
  effectsEnabled,
  onToggleEffects,
}: NowPlayingBarProps) {
  const isPlaying = status === 'playing';
  const isLoading = status === 'loading';
  const [imgError, setImgError] = useState(false);
  const coverUrlForReset = track?.artworkUrl ?? station?.favicon;
  const [prevBarCoverUrl, setPrevBarCoverUrl] = useState(coverUrlForReset);
  if (coverUrlForReset !== prevBarCoverUrl) {
    setPrevBarCoverUrl(coverUrlForReset);
    setImgError(false);
  }
  const coverUrl = track?.artworkUrl ?? station?.favicon;
  const showFallback = !coverUrl || imgError;
  const statusAnnouncement = useMemo(() => {
    if (!station) return 'No station selected';
    const trackInfo = track?.title
      ? track.artist
        ? `${track.artist}, ${track.title}`
        : track.title
      : station.name;
    if (isLoading) return `Loading ${trackInfo}`;
    if (isPlaying) return `Now playing: ${trackInfo}`;
    if (status === 'error') return `Playback error: ${station.name}`;
    return `Paused: ${trackInfo}`;
  }, [station, track, isPlaying, isLoading, status]);
  const [firstTag, compactTags] = useMemo(() => {
    const t = station?.tags;
    if (!t) return ['', ''];
    const i1 = t.indexOf(',');
    if (i1 < 0) return [t, t];
    const first = t.slice(0, i1);
    const i2 = t.indexOf(',', i1 + 1);
    return [first, i2 < 0 ? `${first} · ${t.slice(i1 + 1)}` : `${first} · ${t.slice(i1 + 1, i2)}`];
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
      <div
        className="relative flex items-center justify-between gap-3 pr-4 pt-2 pb-2 min-h-20 shrink-0 safe-bottom safe-x"
        style={SAFE_AREA_STYLE}
      >
        {' '}
        {/* Play/Pause — 48px liquid glass touch target */}{' '}
        <LiquidGlassButton
          onClick={onTogglePlay}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="w-12 h-12 shrink-0 active:scale-95 disabled:opacity-30"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} className="text-white" />
          ) : (
            <Play size={18} className="text-white ml-0.5" />
          )}
        </LiquidGlassButton>{' '}
        {/* Track info + LIVE indicator */}{' '}
        <div className="flex-1 min-w-0">
          {' '}
          {station ? (
            <>
              <p className="text-[13px] font-medium text-white truncate leading-tight">
                {' '}
                {track?.title
                  ? track.artist
                    ? `${track.title} - ${track.artist}`
                    : track.title
                  : station.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {' '}
                {isPlaying && (
                  <>
                    <span className="dot-1.5 bg-red-500 animate-pulse shrink-0" />{' '}
                    <span className="text-[12px] font-semibold tracking-wider uppercase text-red-500 shrink-0">
                      {' '}
                      LIVE
                    </span>
                  </>
                )}{' '}
                <span className="text-[12px] text-white/60 truncate">
                  {track?.album || track?.artist || compactTags || ''}
                </span>
              </div>{' '}
              {station && track?.title && (
                <p className="text-[10px] text-white/25 truncate leading-tight mt-0.5">
                  {station.name}
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px]text-white/50">No station selected</p>
          )}
        </div>{' '}
        {/* Action buttons — 44px touch targets */}{' '}
        <div className="flex items-center gap-0.5 shrink-0">
          {' '}
          {onToggleEffects && (
            <button
              onClick={onToggleEffects}
              className={`w-10 h-10 flex-center-row rounded-xl transition-colors active:scale-95 ${effectsEnabled ? 'text-sys-orange' : 'text-white/45 hover:text-white/60'}`}
              title={effectsEnabled ? 'Disable audio effects' : 'Enable audio effects'}
              aria-label={effectsEnabled ? 'Disable audio effects' : 'Enable audio effects'}
              aria-pressed={!!effectsEnabled}
            >
              <Sparkles size={18} />
            </button>
          )}
          {station && !theaterMode && (
            <button
              onClick={onToggleTheater}
              className="w-10 h-10 flex-center-row rounded-xl text-white/45 hover:text-white/60 transition-colors active:scale-95"
              title="Theater"
              aria-label="Theater mode"
              aria-pressed={theaterMode}
            >
              <Maximize2 size={18} />
            </button>
          )}
        </div>{' '}
        {/* Fill iPhone safe-area inset below the bar without adding layout height */}{' '}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-full glass-blur"
          style={_SAFE_AREA_BOTTOM_STYLE}
        />
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-3 px-4 min-h-18 glass-blur border-t border-border-default shrink-0 safe-bottom safe-x"
      role="region"
      aria-label="Now playing"
    >
      {' '}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusAnnouncement}
      </div>{' '}
      {/* Station info */}{' '}
      <div className="flex-row-2.5 min-w-40">
        {' '}
        <div className="relative w-9 h-9 rounded-lg overflow-hidden shrink-0 bg-surface-2 flex-center-row">
          {' '}
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              {' '}
              <span className="text-white text-[11px] font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {' '}
                {station ? (
                  stationInitials(station.name) || <RadioIcon size={14} className="text-white/60" />
                ) : (
                  <RadioIcon size={14} className="text-white/60" />
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
        </div>{' '}
        {/* TODO replace upper img with next image */}{' '}
        <div className="min-w-0">
          {' '}
          <p className="text-[12px] font-medium text-white truncate">
            {track?.title || station?.name || 'Not Playing'}
          </p>{' '}
          <p className="text-[12px] text-white/60 truncate">
            {track?.album || (track?.artist ? track.artist : firstTag)}
          </p>
        </div>{' '}
        {icyBitrate && (
          <span className="px-1.5 py-0.5 rounded bg-white/10 text-[12px] font-mono text-white/50 shrink-0 self-center">
            {' '}
            {icyBitrate}kbps
          </span>
        )}{' '}
        {streamQuality && isPlaying && (
          <span
            className={`w-2 h-2 rounded-full shrink-0 self-center ${streamQuality === 'good' ? 'bg-green-500' : streamQuality === 'fair' ? 'bg-yellow-500' : streamQuality === 'poor' ? 'bg-red-500' : 'bg-gray-500'}`}
            title={`Stream: ${streamQuality}`}
            aria-label={`Stream quality: ${streamQuality}`}
          />
        )}
      </div>{' '}
      {/* Controls */}{' '}
      <div className="flex-row-0.5">
        <LiquidGlassButton
          onClick={onTogglePlay}
          disabled={!station}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          aria-pressed={isPlaying}
          className="w-10 h-10 disabled:opacity-30"
        >
          {isLoading ? (
            <div className="icon-md border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white ml-0.5" />
          )}
        </LiquidGlassButton>
      </div>{' '}
      {/* LIVE indicator + mini ferrofluid */}{' '}
      <div className="flex-1 flex items-center gap-2 min-w-0 relative">
        {' '}
        {station && isPlaying && (
          <>
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none opacity-40">
              {' '}
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
            <div className="flex flex-col gap-0.5 relative z-10 min-w-0">
              <div className="flex-row-1.5">
                {' '}
                <span className="dot-2 bg-red-500 animate-pulse" />{' '}
                <span className="text-[12px] font-semibold tracking-wider uppercase text-red-500">
                  LIVE
                </span>{' '}
                <AnimatedBars size="small" />
              </div>
              {station && (
                <span className="text-[10px] text-white/25 truncate">{station.name}</span>
              )}
            </div>
          </>
        )}
      </div>{' '}
      {/* Toggles */}{' '}
      <div className="flex-row-1">
        {station && !theaterMode && (
          <button
            onClick={onToggleTheater}
            className="p-2.5 rounded-md transition-colors text-subtle hover:text-white/50"
            title="Theater Mode"
            aria-label="Theater mode"
            aria-pressed={theaterMode}
          >
            <Maximize2 size={14} />
          </button>
        )}{' '}
        {onToggleFav && (
          <button
            onClick={onToggleFav}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            aria-pressed={!!isFavorite}
            className={`p-2.5 rounded-md transition-colors ${isFavorite ? 'text-sys-orange' : 'text-subtle hover:text-white/50'}`}
            title="Favorita"
          >
            <Star size={14} className={isFavorite ? 'fill-sys-orange' : ''} />
          </button>
        )}{' '}
        {onFavSong && (
          <button
            onClick={onFavSong}
            aria-label={songLiked ? 'Unlike song' : 'Like song'}
            aria-pressed={!!songLiked}
            className={`p-2.5 rounded-md transition-colors ${songLiked ? 'text-pink-400' : 'text-subtle hover:text-white/50'}`}
            title="Me gusta canción"
          >
            <Heart size={14} className={songLiked ? 'fill-pink-400' : ''} />
          </button>
        )}{' '}
        {onCycleSleepTimer && (
          <button
            onClick={onCycleSleepTimer}
            className={`p-2.5 rounded-md transition-colors relative ${sleepTimerMin != null ? 'text-sys-orange' : 'text-subtle hover:text-white/50'}`}
            title={sleepTimerMin != null ? `Sleep in ${sleepTimerMin}m` : 'Sleep Timer'}
            aria-label={
              sleepTimerMin != null
                ? `Sleep timer: ${sleepTimerMin} minutes remaining`
                : 'Sleep Timer'
            }
          >
            {' '}
            <Clock size={14} />{' '}
            {sleepTimerMin != null && (
              <span className="absolute -top-1 -right-1 text-[11px] font-bold text-sys-orange leading-none">
                {' '}
                {sleepTimerMin}
              </span>
            )}
          </button>
        )}{' '}
        {onToggleEffects && (
          <button
            onClick={onToggleEffects}
            aria-label={effectsEnabled ? 'Disable audio effects' : 'Enable audio effects'}
            aria-pressed={!!effectsEnabled}
            className={`p-2.5 rounded-md transition-colors ${effectsEnabled ? 'text-sys-orange' : 'text-subtle hover:text-white/50'}`}
            title={effectsEnabled ? 'Disable audio effects' : 'Enable audio effects'}
          >
            <Sparkles size={14} />
          </button>
        )}{' '}
        {effectsEnabled && (
          <button
            onClick={onToggleEq}
            aria-label="Toggle equalizer"
            className={`p-2.5 rounded-md transition-colors ${eqPresetActive ? 'text-sys-orange' : showEq ? 'text-sys-orange bg-surface-2' : 'text-subtle hover:text-white/50'}`}
          >
            <SlidersHorizontal size={14} />
          </button>
        )}
        {station && (
          <button
            onClick={() =>
              shareContent({
                title: track ? `${track.artist ?? station.name} — ${track.title}` : station.name,
                text: track
                  ? `🎵 Listening to ${track.title} by ${track.artist} on Pulse Radio`
                  : `🎵 Listening to ${station.name} on Pulse Radio`,
                url: buildStationShareUrl(station),
              })
            }
            aria-label="Share"
            className="p-2.5 rounded-md transition-colors text-subtle hover:text-white/50"
            title="Share"
          >
            <Share2 size={14} />
          </button>
        )}
      </div>{' '}
      {/* Volume */}{' '}
      <div className="flex-row-1 w-24 min-w-0 shrink-0 overflow-hidden ml-2">
        <button
          onClick={onToggleMute}
          aria-label={muted || volume === 0 ? 'Unmute' : 'Mute'}
          aria-pressed={muted || volume === 0}
          className="p-2 text-white/55 hover:text-white/60 transition-colors shrink-0"
        >
          {' '}
          {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={handleVolumeChange}
          aria-label="Volume"
          className="flex-fill h-0.75 appearance-none bg-surface-3 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_3px_rgba(0,0,0,0.3)]"
        />
      </div>
    </div>
  );
}
const NowPlayingBar = React.memo(_NowPlayingBar);
export { NowPlayingBar };
