/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { FavoriteSong } from '../types';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

export type UseFavoriteSongsReturn = {
  songs: FavoriteSong[];
  add: (song: Omit<FavoriteSong, 'id' | 'timestamp'>) => void;
  remove: (id: string) => void;
  toggle: (song: Omit<FavoriteSong, 'id' | 'timestamp'>) => void;
  has: (title: string, artist: string) => boolean;
  clear: () => void;
};

function songKey(title: string, artist: string) {
  return `${title}|||${artist}`;
}

export function useFavoriteSongs(): UseFavoriteSongsReturn {
  const MAX_SONGS = 500;

  const [songs, setSongs] = useState<FavoriteSong[]>(() => {
    const loaded = loadFromStorage<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, []);
    // Dedup on load in case of corrupted storage
    const seen = new Set<string>();
    return loaded.filter(s => {
      const key = songKey(s.title, s.artist);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITE_SONGS, songs);
  }, [songs]);

  const add = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs(prev => {
      const key = songKey(song.title, song.artist);
      if (prev.some(s => songKey(s.title, s.artist) === key)) return prev;
      const entry: FavoriteSong = {
        ...song,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      return next.length > MAX_SONGS ? next.slice(0, MAX_SONGS) : next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setSongs(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggle = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs(prev => {
      const key = songKey(song.title, song.artist);
      const exists = prev.find(s => songKey(s.title, s.artist) === key);
      if (exists) return prev.filter(s => s.id !== exists.id);
      const entry: FavoriteSong = {
        ...song,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: Date.now(),
      };
      const next = [entry, ...prev];
      return next.length > MAX_SONGS ? next.slice(0, MAX_SONGS) : next;
    });
  }, []);

  const has = useCallback(
    (title: string, artist: string) =>
      songs.some(s => songKey(s.title, s.artist) === songKey(title, artist)),
    [songs],
  );

  const clear = useCallback(() => setSongs([]), []);

  return { songs, add, remove, toggle, has, clear };
}
