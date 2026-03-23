/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Station } from '../types';
import { STORAGE_KEYS, MAX_RECENT } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

export type UseRecentReturn = {
  recent: Station[];
  add: (station: Station) => void;
  remove: (uuid: string) => void;
  clear: () => void;
};

export function useRecent(): UseRecentReturn {
  const [recent, setRecent] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.RECENT, []);
    // Dedup by stationuuid on load in case of corrupted storage
    const seen = new Set<string>();
    return loaded.filter(s => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false;
      seen.add(s.stationuuid);
      return true;
    });
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECENT, recent);
  }, [recent]);

  // Sync recent stations across tabs via storage events
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEYS.RECENT || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue) as Station[];
        if (Array.isArray(parsed)) setRecent(parsed);
      } catch { /* ignore malformed */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const add = useCallback((station: Station) => {
    setRecent(prev => {
      const filtered = prev.filter(s => s.stationuuid !== station.stationuuid);
      return [station, ...filtered].slice(0, MAX_RECENT);
    });
  }, []);

  const remove = useCallback((uuid: string) => {
    setRecent(prev => prev.filter(s => s.stationuuid !== uuid));
  }, []);

  const clear = useCallback(() => setRecent([]), []);

  return { recent, add, remove, clear };
}
