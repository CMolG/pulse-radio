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

export type UseFavoritesReturn = {
  favorites: Station[];
  add: (station: Station) => void;
  remove: (uuid: string) => void;
  toggle: (station: Station) => void;
  has: (uuid: string) => boolean;
  playNext: (currentUuid: string) => Station | null;
  playPrev: (currentUuid: string) => Station | null;
};

export function useFavorites(): UseFavoritesReturn {
  const [favorites, setFavorites] = useState<Station[]>(() =>
    loadFromStorage<Station[]>(STORAGE_KEYS.FAVORITES, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITES, favorites);
  }, [favorites]);

  const add = useCallback((station: Station) => {
    setFavorites(prev => {
      if (prev.some(s => s.stationuuid === station.stationuuid)) return prev;
      return [station, ...prev];
    });
  }, []);

  const remove = useCallback((uuid: string) => {
    setFavorites(prev => prev.filter(s => s.stationuuid !== uuid));
  }, []);

  const toggle = useCallback((station: Station) => {
    setFavorites(prev => {
      const exists = prev.some(s => s.stationuuid === station.stationuuid);
      return exists
        ? prev.filter(s => s.stationuuid !== station.stationuuid)
        : [station, ...prev];
    });
  }, []);

  const has = useCallback(
    (uuid: string) => favorites.some(s => s.stationuuid === uuid),
    [favorites],
  );

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
