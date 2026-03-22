'use client';

import React, { useState } from 'react';
import { Play, Pause, Heart, Radio } from 'lucide-react';
import { motion } from 'motion/react';
import type { Station } from '../types';
import { countryFlag } from '../constants';

type Props = {
  station: Station;
  isPlaying: boolean;
  isCurrent: boolean;
  isFavorite: boolean;
  onPlay: () => void;
  onToggleFav: () => void;
};

function stationInitials(name: string) { return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join(''); }

export default function StationCard({ station, isPlaying, isCurrent, isFavorite, onPlay, onToggleFav }: Props) {
  const [imgError, setImgError] = useState(false);
  const showFallback = !station.favicon || imgError;

  return (<div
      className={`group cursor-pointer rounded-xl p-2 transition-all duration-150 ${isCurrent ? 'bg-surface-3 ring-1 ring-border-strong' : 'hover:bg-surface-2' }`}
      onClick={onPlay}>
      {/* Artwork */}
      <div className="relative aspect-square rounded-lg overflow-hidden bg-surface-2 mb-2">
        {showFallback ? (
          <div className="size-full dawn-gradient flex-center-row">
            <span className="text-white text-lg font-bold select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{stationInitials(station.name) || <Radio size={20} className="text-white/60" />}</span></div>
        ) : (
 <img src={station.favicon} alt="" className="size-full object-cover" onError={() => setImgError(true)}/>
        )}

        {/* Play overlay */}
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.1 }}
          className={`app-overlay-center bg-black/40 transition-opacity duration-200 ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={e => { e.stopPropagation(); onPlay(); }}>
          <div className="dot-10 bg-sys-orange flex-center-row shadow-lg shadow-black/30">
            {isCurrent && isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
          </div>
        </motion.button>

        {/* Favorite badge */}
        <button onClick={e => { e.stopPropagation(); onToggleFav(); }}
          className={`absolute top-1.5 right-1.5 p-1 rounded-full transition-all duration-150 ${isFavorite ? 'opacity-100 bg-black/40' : 'opacity-0 group-hover:opacity-100 bg-black/30 hover:bg-black/50' }`}
        >
 <Heart size={12} className={isFavorite ? 'text-pink-400 fill-pink-400' : 'text-soft'} />
        </button>

        {/* Now-playing indicator */}
        {isCurrent && isPlaying && <span className="absolute bottom-1.5 left-1.5 dot-2 bg-sys-orange animate-pulse" />}
      </div>

      {/* Name */}
      <p className="text-[12px] font-medium text-white truncate leading-tight">{station.name}</p>

      {/* Tags / Country / Format */}
      <div className="flex-row-1 mt-1 flex-wrap">
        {station.codec && (
          <span className="pad-xs bg-surface-3 text-[9px] font-mono text-secondary uppercase flex-shrink-0">
            {station.codec}{station.bitrate > 0 ? ` ${station.bitrate}k` : ''}
          </span>
        )}
        {station.tags?.split(',').slice(0, 1).map(t => t.trim()).filter(Boolean).map(tag => (
          <span key={tag} className="pad-xs-full bg-surface-2 text-[9px] text-secondary truncate max-w-[80px]">{tag}</span>
        ))}
        {station.countrycode && (
          <span className="text-[10px] text-dim leading-none">{countryFlag(station.countrycode)}</span>
        )}
      </div></div>);
}
