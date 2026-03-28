/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';
import React, { useState, useMemo } from 'react';
import { Radio as RadioIcon, Maximize2 } from 'lucide-react';
import type { Station, NowPlayingTrack } from '../constants';
import { UiImage } from './UiImage';
import { AnimatedBars } from './animations/AnimatedBars';
import ParallaxAlbumBackground from './ParallaxAlbumBackground';
import { stationInitials } from '../RadioShell';

function _tagsDisplay(tags: string | undefined): string {
  if (!tags) return 'Internet RadioIcon';
  let result = '';
  let count = 0;
  let start = 0;
  for (let i = 0; i <= tags.length; i++) {
    if (i === tags.length || tags[i] === ',') {
      if (count > 0) result += ' · ';
      result += tags.slice(start, i);
      if (++count === 3) return result;
      start = i + 1;
    }
  }
  return result;
}

type NowPlayingHeroProps = {
  station: Station;
  track: NowPlayingTrack | null;
  isPlaying: boolean;
  frequencyDataRef?: React.RefObject<Uint8Array | null>;
  artworkUrl?: string | null;
  icyBitrate?: string | null;
  onTheater?: () => void;
};
const NowPlayingHero = React.memo(function NowPlayingHero({
  station,
  track,
  isPlaying,
  artworkUrl,
  icyBitrate,
  onTheater,
}: NowPlayingHeroProps) {
  const [imgError, setImgError] = useState(false);
  const coverUrl = artworkUrl ?? station.favicon;
  const [prevCoverUrl, setPrevCoverUrl] = useState(coverUrl);
  if (coverUrl !== prevCoverUrl) {
    setPrevCoverUrl(coverUrl);
    setImgError(false);
  }
  const showFallback = !coverUrl || imgError;
  const heroTags = useMemo(() => _tagsDisplay(station.tags), [station.tags]);
  return (
    <div className="relative flex flex-col px-5 py-4 bg-surface-1 bdr-b overflow-hidden">
      <ParallaxAlbumBackground
        imageUrl={artworkUrl ?? null}
        fallbackUrl={station.favicon || undefined}
        overlayClass="bg-black/60"
      />{' '}
      {onTheater && (
        <button
          onClick={onTheater}
          className="absolute top-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-[12px] font-medium text-white/60 hover:text-white hover:bg-black/60 transition-all"
          title="Theater mode"
        >
          <Maximize2 size={12} /> Theater
        </button>
      )}{' '}
      <div className="relative z-10 flex-row-4 w-full">
        {' '}
        <div className="relative w-16 h-16 rounded-xl bg-surface-2 flex-center-row shrink-0 overflow-hidden">
          {' '}
          {showFallback ? (
            <div className="size-full dawn-gradient flex-center-row">
              {' '}
              <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                {' '}
                {stationInitials(station.name) || <RadioIcon size={24} className="text-white/60" />}
              </span>
            </div>
          ) : (
            <UiImage
              src={coverUrl}
              alt=""
              className="object-cover"
              sizes="64px"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          )}
        </div>
        <div className="flex-fill pr-20">
          {' '}
          <h3 className="text-[15px] font-semibold text-white truncate">
            {track?.title || station.name}
          </h3>{' '}
          {track?.album ? (
            <p className="text-[13px] text-white/60 truncate mt-0.5">{track.album}</p>
          ) : track?.title ? (
            <p className="text-[13px] text-white/60 truncate mt-0.5">{track.artist || ''}</p>
          ) : (
            <p className="text-[12px] text-white/60 truncate mt-0.5">{heroTags}</p>
          )}{' '}
          {track?.title && (
            <p className="text-[10px] text-white/25 truncate mt-0.5">{station.name}</p>
          )}{' '}
          {isPlaying && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="dot-1.5 bg-sys-orange" />{' '}
              <span className="text-[12px] font-semibold tracking-wider uppercase text-sys-orange">
                LIVE
              </span>{' '}
              <AnimatedBars size="small" />{' '}
              {icyBitrate && (
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[12px] font-mono text-white/50 ml-1">
                  {' '}
                  {icyBitrate}kbps
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default NowPlayingHero;
export type { NowPlayingHeroProps };
