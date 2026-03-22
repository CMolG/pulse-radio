/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Play, Pause, SkipForward, SkipBack, Search, Heart, Volume2 } from 'lucide-react';
import type { Station, WidgetPlaybackState } from '../types';
import { STORAGE_KEYS, countryFlag } from '../constants';
import { searchStations, topStations } from '../services/radioApi';
import { loadFromStorage } from '@/lib/storageUtils';

function sendCommand(action: string, station?: Station) {
  window.dispatchEvent(new CustomEvent('radio-command', { detail: { action, station } }));
}

export default function RadioImmersiveWidget({ preview }: { preview?: boolean }) {
  const [state, setState] = useState<WidgetPlaybackState | null>(null);
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [widgetVolume, setWidgetVolume] = useState(0.8);

  useEffect(() => {
    if (preview) return;
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.PLAYBACK);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState(parsed);
          if (typeof parsed.volume === 'number') setWidgetVolume(parsed.volume);
        }
      } catch { /* ok */ }
      try {
        setFavorites(loadFromStorage(STORAGE_KEYS.FAVORITES, []))
      } catch { /* ok */ }
    };
    read();
    const iv = setInterval(read, 3000);
    return () => clearInterval(iv);
  }, [preview]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      const top = await topStations(8);
      setResults(top);
    } else {
      const found = await searchStations(query.trim(), 8);
      setResults(found);
    }
    setShowResults(true);
  }, [query]);

  const handleVolumeChange = useCallback((v: number) => {
    setWidgetVolume(v);
    sendCommand('setVolume');
    window.dispatchEvent(new CustomEvent('radio-command', { detail: { action: 'setVolume', volume: v } }));
  }, []);

  const isPlaying = state?.status === 'playing';
  const station = state?.station;
  const track = state?.track;

  return (<div className="col-full bg-sys-surface/80 backdrop-blur-xl card-lg p-3 select-none overflow-hidden relative">
      {/* Blurred art bg */}
      {station?.favicon && (
        <img
          src={station.favicon}
          alt=""
          className="abs-fill size-full object-cover blur-3xl opacity-15 pointer-events-none"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex-row-1.5 mb-2">
          <Radio size={14} className="text-sys-orange" />
          <span className="app-label font-semibold">Radio</span>
          {isPlaying && (
            <span className="ml-auto flex-row-1 pad-sm-full bg-sys-orange/15 border border-sys-orange/20">
              <span className="dot-1.5 bg-sys-orange animate-pulse" />
              <span className="text-[9px] text-sys-orange font-semibold tracking-wide">LIVE</span>
            </span>
          )}
        </div>

        {/* Search bar */}
        <form onSubmit={e => { e.preventDefault(); handleSearch(); }}
          className="flex-row-1.5 px-2 py-1.5 rounded-lg panel-2 mb-2">
          <Search size={12} className="text-subtle flex-shrink-0" />
 <input type="text" placeholder="Search stations…" value={query} onChange={e => setQuery(e.target.value)}
            className="bg-transparent text-[11px] text-white placeholder:text-white/25 outline-none w-full"/>
        </form>

        {/* Search results or Now Playing */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {showResults && results.length > 0 ? (
            <div className="space-y-0.5">
              {results.map(s => (
 <button key={s.stationuuid} onClick={() => { sendCommand('play', s); setShowResults(false); }}
                  className="w-full flex-row-2 text-left px-2 py-1.5 rounded-md hover-2">
                  <span className="text-[10px]">{countryFlag(s.countrycode)}</span>
                  <span className="text-[11px] text-soft truncate flex-1">{s.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {/* Now playing info */}
              {station && (
                <div className="flex-row-2 mb-2 px-1">
                  <div className="w-10 h-10 rounded-lg bg-surface-2 flex-center-row flex-shrink-0 overflow-hidden">
                    {station.favicon ? (
 <img src={station.favicon} alt="" className="size-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}/>
                    ) : (
                      <Radio size={14} className="text-faint" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-white truncate">{station.name}</p>
                    <p className="text-[10px] text-muted truncate">
                      {track?.title ? (track.artist ? `${track.artist} — ${track.title}` : track.title) : station.tags?.split(',')[0] || 'Radio'
                      }
                    </p></div></div>
              )}

              {/* Fav pills */}
              {favorites.length > 0 && (
                <div className="flex-wrap-1 px-1">
                  {favorites.slice(0, 6).map(s => (
 <button key={s.stationuuid} onClick={() => sendCommand('play', s)}
                      className="flex-row-1 pad-sm-full bg-surface-2 hover-4">
                      <Heart size={9} className="text-pink-400/60" fill="currentColor" />
                      <span className="text-[10px] text-secondary truncate max-w-[80px]">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Volume slider */}
        <div className="flex-row-2 mt-2 px-1">
          <Volume2 size={12} className="text-subtle flex-shrink-0" />
 <input type="range" min="0" max="1" step="0.01" value={widgetVolume} onChange={e => handleVolumeChange(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-surface-3 rounded-full accent-[#34c759] cursor-pointer"/>
          <span className="text-[9px] text-subtle w-6 text-right tabular-nums">{Math.round(widgetVolume * 100)}</span>
        </div>

        {/* Controls */}
        <div className="flex-center-row gap-3 mt-2 pt-2 bdr-t">
          <button onClick={() => sendCommand('skipPrev')} className="text-muted hover:text-white transition-colors"><SkipBack size={14} /></button>
          <button onClick={() => sendCommand('togglePlay')}
            className="dot-8 bg-surface-4 hover:bg-surface-7 flex-center-row text-white transition-colors">
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>
          <button onClick={() => sendCommand('skipNext')} className="text-muted hover:text-white transition-colors">
            <SkipForward size={14} />
          </button></div></div></div>);
}
