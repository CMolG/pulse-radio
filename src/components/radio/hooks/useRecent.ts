/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client'; import { useState, useCallback, useEffect } from 'react';
import type { Station } from '../types'; import { STORAGE_KEYS, MAX_RECENT } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils'; import { useStorageSync } from '@/lib/useStorageSync';
export function useRecent() { const [recent, setRecent] = useState<Station[]>(() => {
    const loaded = loadFromStorage<Station[]>(STORAGE_KEYS.RECENT, []);
    const seen = new Set<string>(); // Dedup by stationuuid on load in case of corrupted storage
    return loaded.filter(s => {
      if (!s.stationuuid || seen.has(s.stationuuid)) return false; seen.add(s.stationuuid); return true;});
  }); useEffect(() => { saveToStorage(STORAGE_KEYS.RECENT, recent); }, [recent]); useStorageSync<Station[]>(STORAGE_KEYS.RECENT, setRecent);
  const add = useCallback((station: Station) => { setRecent(prev => {
      const filtered = prev.filter(s => s.stationuuid !== station.stationuuid);
      return [station, ...filtered].slice(0, MAX_RECENT);});}, []);
  const remove = useCallback((uuid: string) => { setRecent(prev => prev.filter(s => s.stationuuid !== uuid)); }, []);
  const clear = useCallback(() => setRecent([]), []); return { recent, add, remove, clear }; }
