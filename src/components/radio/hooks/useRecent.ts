/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import type { Station } from '@/components/radio/constants';
import { STORAGE_KEYS, MAX_RECENT } from '@/components/radio/constants';
import { useStorageSync } from './useStorageSync';

export function useRecent() {
  const [recent, setRecent] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.RECENT, []);
    const seen = new Set<string>();
    return loaded.filter((s) => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECENT, recent);
  }, [recent]);
  useStorageSync<Station[]>(STORAGE_KEYS.RECENT, setRecent);
  const add = useCallback((station: Station) => {
    setRecent((prev) => {
      const filtered = prev.filter((s) => s.stationuuid !== station.stationuuid);
      filtered.unshift(station);
      if (filtered.length > MAX_RECENT) filtered.length = MAX_RECENT;
      return filtered;
    });
  }, []);
  const remove = useCallback((uuid: string) => {
    setRecent((prev) => prev.filter((s) => s.stationuuid !== uuid));
  }, []);
  const clear = useCallback(() => setRecent([]), []);
  return { recent, add, remove, clear };
}
