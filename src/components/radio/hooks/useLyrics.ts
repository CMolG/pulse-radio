'use client';

import { useState, useRef, useEffect } from 'react';
import type { NowPlayingTrack, LyricsData } from '../types';
import { fetchLyrics as fetchLyricsApi } from '../services/lyricsApi';
import { STORAGE_KEYS } from '../constants';

const MAX_CACHE = 50;

type CacheEntry = { key: string; data: LyricsData };

function loadCache(): CacheEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LYRICS_CACHE);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCache(entries: CacheEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.LYRICS_CACHE, JSON.stringify(entries.slice(0, MAX_CACHE)));
  } catch { /* storage full */ }
}

export type UseLyricsReturn = {
  lyrics: LyricsData | null;
  loading: boolean;
};

export function useLyrics(track: NowPlayingTrack | null): UseLyricsReturn {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();

    if (!track || !track.artist || !track.title) {
      setLyrics(null);
      lastKeyRef.current = '';
      return;
    }

    const key = `${track.artist}:${track.title}`.toLowerCase();
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;

    // Check localStorage cache
    const cached = loadCache();
    const hit = cached.find(e => e.key === key);
    if (hit) {
      setLyrics(hit.data);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    fetchLyricsApi(track.artist, track.title)
      .then(result => {
        if (controller.signal.aborted) return;
        if (result) {
          setLyrics(result);
          const updated = [{ key, data: result }, ...cached.filter(e => e.key !== key)];
          saveCache(updated);
        } else {
          setLyrics(null);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setLyrics(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [track?.artist, track?.title]);

  return { lyrics, loading };
}
