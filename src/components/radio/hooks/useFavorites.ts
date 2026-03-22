'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Station } from '../types';
import { STORAGE_KEYS } from '../constants';

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
  const [favorites, setFavorites] = useState<Station[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
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
