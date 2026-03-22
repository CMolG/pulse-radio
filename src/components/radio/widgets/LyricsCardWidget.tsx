/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Mic2 } from 'lucide-react';
import type { WidgetPlaybackState, LyricsData } from '../types';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage } from '@/lib/storageUtils';

export default function LyricsCardWidget({ preview }: { preview?: boolean }) {
  const [state, setState] = useState<WidgetPlaybackState | null>(null);
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);

  useEffect(() => {
    if (preview) return;
    const read = () => {
      try {
        setState(loadFromStorage(STORAGE_KEYS.PLAYBACK, null))
      } catch { /* ignore */ }
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.LYRICS_CACHE);
        if (raw) {
          const cache: { key: string; data: LyricsData }[] = JSON.parse(raw);
          if (cache.length > 0) setLyrics(cache[0].data);
        }
      } catch { /* ignore */ }
    };
    read();
    const iv = setInterval(read, 3000);
    return () => clearInterval(iv);
  }, [preview]);

  const track = state?.track;
  const lines = lyrics?.lines ?? [];
  const mid = Math.floor(lines.length / 2);
  const visibleLines = lines.slice(Math.max(0, mid - 1), mid + 2);

  return (<div
      className="col-full bg-sys-surface/80 backdrop-blur-xl card-lg p-3 select-none overflow-hidden cursor-pointer"
      onClick={() => {
        if (!preview) {
          window.dispatchEvent(new CustomEvent('os-open-app', { detail: { appId: 'app-radio' } }));
        }
      }}>
      <div className="flex-row-1.5 mb-2">
        <Mic2 size={12} className="text-sys-orange" />
        <span className="text-[9px] text-muted caps font-semibold">Lyrics</span>
      </div>

      {track && (
        <div className="mb-2">
          <p className="text-[11px] font-medium text-white truncate">{track.title}</p>
          <p className="text-[9px] text-muted truncate">{track.artist}</p>
        </div>
      )}

      <div className="col-fill justify-center gap-1">
        {visibleLines.length > 0 ? (
          visibleLines.map((line, i) => (
 <p key={i} className={`text-[12px] leading-relaxed text-center transition-all ${ i === 1 ? 'text-white font-semibold' : 'text-subtle' }`} >
              {line.text || '♪'}
            </p>
          ))
        ) : (
          <p className="text-[11px] text-faint text-center">No lyrics available</p>
        )}
      </div></div>);
}
