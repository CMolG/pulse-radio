/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Radio, Play, Pause, SkipForward, Heart } from 'lucide-react';
import type { Station, WidgetPlaybackState } from '../types';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage } from '@/lib/storageUtils';
import UiImage from '@/components/common/UiImage';

function sendCommand(action: string, station?: Station) {
  window.dispatchEvent(new CustomEvent('radio-command', { detail: { action, station } }));
}

function RadioMiniWidget({ preview }: { preview?: boolean }) {
  const [state, setState] = useState<WidgetPlaybackState | null>(null);
  const [favorites, setFavorites] = useState<Station[]>([]);

  useEffect(() => {
    if (preview) return;
    const MAX_STALE_MS = 30_000;
    let lastRaw = '';
    let lastFavRaw = '';
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYBACK) ?? '';
        if (raw && raw !== lastRaw) {
          lastRaw = raw;
          const parsed = JSON.parse(raw) as WidgetPlaybackState | null;
          if (parsed?.updatedAt && Date.now() - parsed.updatedAt > MAX_STALE_MS) {
            setState(prev => prev ? { ...prev, status: 'paused' as const } : prev);
          } else {
            setState(parsed);
          }
        } else if (raw && raw === lastRaw) {
          const parsed = JSON.parse(raw) as WidgetPlaybackState | null;
          if (parsed?.updatedAt && Date.now() - parsed.updatedAt > MAX_STALE_MS) {
            setState(prev => prev ? { ...prev, status: 'paused' as const } : prev);
          }
        }
      } catch { /* ok */ }
      try {
        const favRaw = localStorage.getItem(STORAGE_KEYS.FAVORITES) ?? '';
        if (favRaw !== lastFavRaw) {
          lastFavRaw = favRaw;
          setFavorites(loadFromStorage(STORAGE_KEYS.FAVORITES, []));
        }
      } catch { /* ok */ }
    };
    read();
    const iv = setInterval(read, 3000);
    return () => clearInterval(iv);
  }, [preview]);

  const displayFavs = useMemo(() => favorites.slice(0, 3), [favorites]);

  const isPlaying = state?.status === 'playing';
  const station = state?.station;
  const track = state?.track;

  return (<div className="col-full bg-sys-surface/80 backdrop-blur-xl card-lg p-3 select-none overflow-hidden relative">
      {/* Blurred art bg */}
      {station?.favicon && (
        <UiImage
          src={station.favicon}
          alt=""
          className="object-cover blur-2xl opacity-15 pointer-events-none"
          sizes="300px"
        />
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex-row-1.5 mb-1">
          <Radio size={12} className="text-sys-orange" />
          <span className="text-[9px] text-muted caps font-semibold">Radio</span>
          {isPlaying && <span className="text-[9px] text-sys-orange ml-auto">● LIVE</span>}
        </div>

        <div className="flex-1 flex-center-row min-h-0">
          <p className="text-[12px] font-medium text-white text-center truncate px-1">{track?.title || station?.name || 'No station'}</p></div>

        {/* Favorite station pills */}
        {favorites.length > 0 && (
          <div className="flex-center-row gap-1 mb-1.5 flex-wrap">
            {displayFavs.map(s => (
 <button key={s.stationuuid} onClick={() => sendCommand('play', s)}
                aria-label={`Play ${s.name}`}
                className="flex-row-1 pad-sm-full bg-surface-2 hover-4">
                <Heart size={7} className="text-pink-400/60" fill="currentColor" />
                <span className="text-[9px] text-dim truncate max-w-[60px]">{s.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-center-row gap-3 mt-1">
          <button onClick={() => sendCommand('togglePlay')}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="dot-7 bg-surface-4 hover:bg-surface-7 flex-center-row text-white transition-colors">
            {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
          </button>
          <button onClick={() => sendCommand('skipNext')}
            aria-label="Next station"
            className="text-muted hover:text-white transition-colors">
            <SkipForward size={14} />
          </button></div></div></div>);
}

export default React.memo(RadioMiniWidget);
