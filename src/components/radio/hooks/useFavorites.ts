/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Station } from '../types';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';
import { useStorageSync } from '@/lib/useStorageSync';

const MAX_FAVORITES = 500;

export function useFavorites() {
  const [favorites, setFavorites] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.FAVORITES, []);
    // Dedup on load in case of corrupted storage
    const seen = new Set<string>();
    return loaded.filter(s => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });
  useEffect(() => { saveToStorage(STORAGE_KEYS.FAVORITES, favorites); }, [favorites]);
  useStorageSync<Station[]>(STORAGE_KEYS.FAVORITES, setFavorites);
  const add = useCallback((station: Station) => {
    setFavorites(prev => {
      if (prev.some(s => s.stationuuid === station.stationuuid)) return prev;
      return [station, ...prev].slice(0, MAX_FAVORITES);
    });
  }, []);
  const remove = useCallback((uuid: string) => { setFavorites(prev => prev.filter(s => s.stationuuid !== uuid)); }, []);
  const toggle = useCallback((station: Station) => {
    setFavorites(prev => {
      const exists = prev.some(s => s.stationuuid === station.stationuuid);
      if (exists) return prev.filter(s => s.stationuuid !== station.stationuuid);
      return [station, ...prev].slice(0, MAX_FAVORITES);
    });
  }, []);
  const has = useCallback((uuid: string) => favorites.some(s => s.stationuuid === uuid), [favorites]);
  const playNext = useCallback((currentUuid: string): Station | null => {
    const idx = favorites.findIndex(s => s.stationuuid === currentUuid);
    if (idx < 0 || favorites.length < 2) return null;
    return favorites[(idx + 1) % favorites.length];
  }, [favorites]);
  const playPrev = useCallback((currentUuid: string): Station | null => {
    const idx = favorites.findIndex(s => s.stationuuid === currentUuid);
    if (idx < 0 || favorites.length < 2) return null;
    return favorites[(idx - 1 + favorites.length) % favorites.length];
  }, [favorites]);
  return { favorites, add, remove, toggle, has, playNext, playPrev };
}
