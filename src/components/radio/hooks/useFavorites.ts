/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect, useMemo } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import type { Station } from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';
import { useStorageSync } from './useStorageSync';

const MAX_FAVORITES = 500;

export function useFavorites() {
  const [favorites, setFavorites] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.FAVORITES, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.FAVORITES, favorites);
  }, [favorites]);
  useStorageSync<Station[]>(STORAGE_KEYS.FAVORITES, setFavorites);
  const favUuids = useMemo(() => {
    const s = new Set<string>();
    for (const f of favorites) s.add(f.stationuuid);
    return s;
  }, [favorites]);
  const add = useCallback((station: Station) => {
    setFavorites((prev) => {
      if (prev.some((s) => s.stationuuid === station.stationuuid)) return prev;
      const next = [station, ...prev];
      return next.length > MAX_FAVORITES ? ((next.length = MAX_FAVORITES), next) : next;
    });
  }, []);
  const remove = useCallback((uuid: string) => {
    setFavorites((prev) => prev.filter((s) => s.stationuuid !== uuid));
  }, []);
  const toggle = useCallback((station: Station) => {
    setFavorites((prev) => {
      const exists = prev.some((s) => s.stationuuid === station.stationuuid);
      if (exists) return prev.filter((s) => s.stationuuid !== station.stationuuid);
      const next = [station, ...prev];
      return next.length > MAX_FAVORITES ? ((next.length = MAX_FAVORITES), next) : next;
    });
  }, []);
  const has = useCallback((uuid: string) => favUuids.has(uuid), [favUuids]);
  const playNext = useCallback(
    (currentUuid: string): Station | null => {
      const idx = favorites.findIndex((s) => s.stationuuid === currentUuid);
      if (idx < 0 || favorites.length < 2) return null;
      return favorites[(idx + 1) % favorites.length];
    },
    [favorites],
  );
  const playPrev = useCallback(
    (currentUuid: string): Station | null => {
      const idx = favorites.findIndex((s) => s.stationuuid === currentUuid);
      if (idx < 0 || favorites.length < 2) return null;
      return favorites[(idx - 1 + favorites.length) % favorites.length];
    },
    [favorites],
  );
  return { favorites, add, remove, toggle, has, playNext, playPrev };
}
