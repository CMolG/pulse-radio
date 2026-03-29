/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import type { FavoriteSong } from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';
import { useStorageSync } from './useStorageSync';

function _uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function songKey(title: string, artist: string) {
  return `${title}|||${artist}`;
}

/** Build a Set of songKeys from a song array for O(1) lookups. */
function buildKeySet(songs: FavoriteSong[]): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < songs.length; i++) {
    s.add(songKey(songs[i].title, songs[i].artist));
  }
  return s;
}

export function useFavoriteSongs() {
  const MAX_SONGS = 500;
  const [songs, setSongs] = useState<FavoriteSong[]>(() => {
    const loaded = loadFromStorage<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      const key = songKey(s.title, s.artist);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  });
  const keySetRef = useRef<Set<string>>(null!);
  if (!keySetRef.current) keySetRef.current = buildKeySet(songs);
  useMemo(() => {
    keySetRef.current = buildKeySet(songs);
  }, [songs]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITE_SONGS, songs);
  }, [songs]);
  useStorageSync<FavoriteSong[]>(STORAGE_KEYS.FAVORITE_SONGS, setSongs);
  const prepend = (song: Omit<FavoriteSong, 'id' | 'timestamp'>, prev: FavoriteSong[]) => {
    const now = Date.now();
    const entry: FavoriteSong = {
      ...song,
      id: _uid(),
      timestamp: now,
    };
    const next = [entry, ...prev];
    return next.length > MAX_SONGS ? ((next.length = MAX_SONGS), next) : next;
  };
  const add = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs((prev) =>
      keySetRef.current.has(songKey(song.title, song.artist)) ? prev : prepend(song, prev),
    );
  }, []);
  const remove = useCallback((id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
  }, []);
  const toggle = useCallback((song: Omit<FavoriteSong, 'id' | 'timestamp'>) => {
    setSongs((prev) => {
      const key = songKey(song.title, song.artist);
      const exists = prev.find((s) => songKey(s.title, s.artist) === key);
      return exists ? prev.filter((s) => s.id !== exists.id) : prepend(song, prev);
    });
  }, []);
  const has = useCallback(
    (title: string, artist: string) => keySetRef.current.has(songKey(title, artist)),
    [],
  );
  const clear = useCallback(() => setSongs([]), []);
  return { songs, add, remove, toggle, has, clear };
}
