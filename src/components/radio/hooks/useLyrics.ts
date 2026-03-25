/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import type { NowPlayingTrack, LyricsData } from '../types';
import { fetchLyrics as fetchLyricsApi } from '../services/lyricsApi';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';
import { useRealtimeLyricsSync } from './useRealtimeLyricsSync';
import type { RealtimeSyncDiagnostics, RealtimeSyncStatus } from '../services/realtimeLyricsTypes';

const MAX_CACHE = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
type CacheEntry = { key: string; data: LyricsData; ts: number };

function loadCache(): CacheEntry[] {
  const raw = loadFromStorage<{ key: string; data: LyricsData; ts?: number }[]>(STORAGE_KEYS.LYRICS_CACHE, []);
  // Backfill ts=0 for old entries so they expire on next TTL check — mutate in place to avoid allocation
  for (let i = 0; i < raw.length; i++) { if (raw[i].ts === undefined) (raw[i] as CacheEntry).ts = 0; }
  return raw as CacheEntry[];
}

function saveCache(entries: CacheEntry[]) { saveToStorage(STORAGE_KEYS.LYRICS_CACHE, entries.slice(0, MAX_CACHE)); }

export function useLyrics( track: NowPlayingTrack | null, stationName?: string | null,
  options?: { currentTime?: number; enableRealtime?: boolean; languageHint?: 'en' | 'es'; },
) {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RETRIES = 2;
  const enableRealtime = Boolean(options?.enableRealtime && track?.title);
  const doFetch = (key: string, cached: CacheEntry[], controller: AbortController) => {
    if (controller.signal.aborted || !track?.title) return;
    setLoading(true); setError(false);
    fetchLyricsApi( track.artist || stationName || '', track.title, track.album, undefined, stationName ?? undefined,
      controller.signal,
    ).then(result => {
        if (controller.signal.aborted) return;
        retryCountRef.current = 0;
        if (result) {
          setLyrics(result);
          const updated = [{ key, data: result, ts: Date.now() }, ...cached.filter(e => e.key !== key)];
          saveCache(updated);
        } else setLyrics(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++; const delay = 1000 * Math.pow(2, retryCountRef.current - 1);
          retryTimerRef.current = setTimeout(() => doFetch(key, cached, controller), delay);
        } else { setLyrics(null); setError(true); retryCountRef.current = 0; }
      })
      .finally(() => { if (!controller.signal.aborted && retryCountRef.current === 0) setLoading(false); });
  };

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort(); if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;

    if (!track || !track.title) {
      setLoading(false); setLyrics(null);
      setError(false);
      lastKeyRef.current = '';
      return;
    }

    const artistSeed = (track.artist || stationName || 'unknown').trim();
    const key = `${artistSeed}\n${track.title}`.toLowerCase();
    if (key === lastKeyRef.current) return; lastKeyRef.current = key;

    const cached = loadCache(); const hit = cached.find(e => e.key === key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      setLoading(false); setLyrics(hit.data);
      setError(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);

    return () => { controller.abort(); if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.artist, track?.title, track?.album, stationName]);

  const retry = () => {
    if (!track?.title) return;
    const artistSeed = (track.artist || stationName || 'unknown').trim();
    const key = `${artistSeed}\n${track.title}`.toLowerCase(); const cached = loadCache();
    if (abortRef.current) abortRef.current.abort(); if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
  };

  const realtimeSync = useRealtimeLyricsSync({
    lyrics,
    enabled: enableRealtime,
    languageHint: options?.languageHint ?? 'en',
  });

  return {
    lyrics,
    loading,
    error,
    retry,
    effectiveCurrentTime: enableRealtime ? (realtimeSync.effectiveCurrentTime ?? options?.currentTime)
      : options?.currentTime,
    realtime: enableRealtime
      ? {
          enabled: realtimeSync.enabled,
          supported: realtimeSync.supported,
          status: realtimeSync.status,
          activeLineIndex: realtimeSync.activeLineIndex,
          candidateLineIndex: realtimeSync.candidateLineIndex,
          confidence: realtimeSync.confidence,
          diagnostics: realtimeSync.diagnostics,
          toggle: realtimeSync.toggle,
        }
      : undefined,
  };
}
