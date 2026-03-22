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

const MAX_CACHE = 50;

type CacheEntry = { key: string; data: LyricsData };

function loadCache(): CacheEntry[] {
  return loadFromStorage<CacheEntry[]>(STORAGE_KEYS.LYRICS_CACHE, []);
}

function saveCache(entries: CacheEntry[]) {
  saveToStorage(STORAGE_KEYS.LYRICS_CACHE, entries.slice(0, MAX_CACHE));
}

export type UseLyricsReturn = {
  lyrics: LyricsData | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
};

export function useLyrics(
  track: NowPlayingTrack | null,
  stationName?: string | null,
): UseLyricsReturn {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX_RETRIES = 2;

  const doFetch = (key: string, cached: CacheEntry[], controller: AbortController) => {
    if (!track?.title) return;
    setLoading(true);
    setError(false);
    fetchLyricsApi(
      track.artist || stationName || '',
      track.title,
      track.album,
      undefined,
      stationName ?? undefined,
    )
      .then(result => {
        if (controller.signal.aborted) return;
        retryCountRef.current = 0;
        if (result) {
          setLyrics(result);
          const updated = [{ key, data: result }, ...cached.filter(e => e.key !== key)];
          saveCache(updated);
        } else {
          setLyrics(null);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = 1000 * Math.pow(2, retryCountRef.current - 1);
          retryTimerRef.current = setTimeout(() => doFetch(key, cached, controller), delay);
        } else {
          setLyrics(null);
          setError(true);
          retryCountRef.current = 0;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && retryCountRef.current === 0) setLoading(false);
      });
  };

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;

    if (!track || !track.title) {
      setLoading(false);
      setLyrics(null);
      setError(false);
      lastKeyRef.current = '';
      return;
    }

    const artistSeed = (track.artist || stationName || 'unknown').trim();
    const key = `${artistSeed}:${track.title}`.toLowerCase();
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    const cached = loadCache();
    const hit = cached.find(e => e.key === key);
    if (hit) {
      setLoading(false);
      setLyrics(hit.data);
      setError(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);

    return () => {
      controller.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.artist, track?.title, track?.album, stationName]);

  const retry = () => {
    if (!track?.title) return;
    const artistSeed = (track.artist || stationName || 'unknown').trim();
    const key = `${artistSeed}:${track.title}`.toLowerCase();
    const cached = loadCache();
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
  };

  return { lyrics, loading, error, retry };
}
