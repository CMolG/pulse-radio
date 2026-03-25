/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */
'use client';
import React, { useState, useMemo } from 'react';
import { Play, Pause, Heart, Radio, Music2, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { Station } from '../types';
import { countryFlag } from '../constants';
import UiImage from '@/components/common/UiImage';
import { stationInitials } from '../utils/formatUtils';
type Props = {
  station: Station; isPlaying: boolean; isCurrent: boolean; isFavorite: boolean;
  onPlay: () => void; onToggleFav: () => void;
  liveStatus?: 'loading' | 'loaded' | 'error'; liveTrack?: { title: string; artist: string } | null;
  onPeek?: () => void; onPrefetch?: () => void;
};
export default React.memo(function StationCard({ station, isPlaying, isCurrent, isFavorite, onPlay, onToggleFav, liveStatus, liveTrack, onPeek, onPrefetch }: Props) {
  const [imgError, setImgError] = useState(false); const showFallback = !station.favicon || imgError;
  const tags = useMemo( () => station.tags?.split(',').slice(0, 1).map(t => t.trim()).filter(Boolean) ?? [],
    [station.tags],
  );
  return (<div
      role="button"
      tabIndex={0}
      aria-label={`${station.name}${isCurrent && isPlaying ? ' (playing)' : ''}`}
      className={`group cursor-pointer rounded-xl p-2 transition-all duration-150 ${isCurrent ? 'bg-surface-3 ring-1 ring-border-strong' : 'hover:bg-surface-2' }`}
      onClick={onPlay}
      onMouseEnter={onPrefetch}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPlay(); } }}> {/* Artwork */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 mb-2">
        {showFallback ? (
          <div className="size-full dawn-gradient flex-center-row">
            <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{stationInitials(station.name) || <Radio size={20} className="text-white/60" />}</span></div>
        ) : (
          <UiImage
            src={station.favicon}
            alt=""
            className="object-cover"
            sizes="180px"
            loading="lazy"
            onError={() => setImgError(true)} />
        )}
        {/* Play overlay */} <motion.button
          aria-label={isCurrent && isPlaying ? 'Pause' : 'Play'}
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className={`app-overlay-center bg-black/40 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={e => { e.stopPropagation(); onPlay(); }}>
          <div className="dot-10 bg-sys-orange flex-center-row shadow-lg shadow-black/30">
            {isCurrent && isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
          </div></motion.button>
        {/* Favorite badge */} <button onClick={e => { e.stopPropagation(); onToggleFav(); }}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-pressed={isFavorite}
          className={`absolute top-1.5 right-1.5 p-1 rounded-full transition-all duration-150 ${isFavorite ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50' }`}
        ><Heart size={12} className={isFavorite ? 'text-pink-400 fill-pink-400' : 'text-soft'} /></button>
        {/* Now-playing indicator */}
        {isCurrent && isPlaying && <span className="absolute bottom-1.5 left-1.5 dot-2 bg-sys-orange animate-pulse" />}
      </div> {/* Name */} <p className="text-[12px] font-medium text-white truncate leading-tight">{station.name}</p>
      {/* Tags / Country / Format */} <div className="flex-row-1 mt-1 flex-wrap">
        {station.codec && (
          <span className="pad-xs bg-surface-3 text-[9px] font-mono text-secondary uppercase flex-shrink-0">
            {station.codec}{station.bitrate > 0 ? ` ${station.bitrate}k` : ''}</span>
        )}
        {tags.map(tag => (
          <span key={tag} className="pad-xs-full bg-surface-2 text-[9px] text-secondary truncate max-w-[80px]">{tag}</span>
        ))}
        {station.countrycode && (
          <span className="text-[10px] text-dim leading-none">{countryFlag(station.countrycode)}</span>)}</div>
      {/* Live track preview */}
      {liveStatus === 'loading' && (
        <div className="flex items-center gap-1 mt-1.5">
          <Loader2 size={9} className="text-dim animate-spin flex-shrink-0" />
          <span className="text-[9px] text-dim">Checking…</span></div>
      )}
      {liveStatus === 'loaded' && (
        <div className="flex items-center gap-1 mt-1.5 min-w-0">
          {liveTrack ? (
            <><Music2 size={9} className="text-sys-orange flex-shrink-0" />
              <span className="text-[9px] text-white/60 truncate leading-tight">
                {liveTrack.artist ? `${liveTrack.artist} – ${liveTrack.title}` : liveTrack.title}</span></>
          ) : (
            <span className="text-[9px] text-white/20">No track info</span>)}</div>
      )}
      {onPeek && !liveStatus && (
        <button
          onClick={e => { e.stopPropagation(); onPeek(); }}
          className="flex items-center gap-1 mt-1.5 text-[9px] text-dim hover:text-white/50 transition-colors">
          <Music2 size={9} />
          Check track</button>
      )}
    </div>);
}, (prev, next) =>
  prev.station === next.station &&
  prev.isPlaying === next.isPlaying &&
  prev.isCurrent === next.isCurrent &&
  prev.isFavorite === next.isFavorite &&
  prev.liveStatus === next.liveStatus &&
  prev.liveTrack === next.liveTrack
);
