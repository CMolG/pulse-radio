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
  const [recent, setRecent] = useState<Station[]>(() =>
    loadFromStorage<Station[]>(STORAGE_KEYS.RECENT, [])
  );

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.RECENT, recent);
  }, [recent]);

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
