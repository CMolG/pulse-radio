/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Station } from '../types';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

const STORAGE_KEY = 'radio-station-queue';
const MAX_QUEUE_SIZE = 20;

export type UseStationQueueReturn = {
  queue: Station[];
  currentIndex: number;
  add: (station: Station) => void;
  addNext: (station: Station) => void;
  remove: (stationuuid: string) => void;
  clear: () => void;
  moveUp: (stationuuid: string) => void;
  moveDown: (stationuuid: string) => void;
  skipToNext: () => Station | null;
  skipToPrev: () => Station | null;
  hasNext: boolean;
  hasPrev: boolean;
  setPlaying: (stationuuid: string) => void;
};

export function useStationQueue(): UseStationQueueReturn {
  const [queue, setQueue] = useState<Station[]>(() =>
    loadFromStorage<Station[]>(STORAGE_KEY, [])
  );
  const [currentIndex, setCurrentIndex] = useState(-1);
  const persistRef = useRef(false);

  // Persist queue to storage on changes (skip initial mount)
  useEffect(() => {
    if (persistRef.current) {
      saveToStorage(STORAGE_KEY, queue);
    }
    persistRef.current = true;
  }, [queue]);

  const add = useCallback((station: Station) => {
    setQueue(prev => {
      if (prev.some(s => s.stationuuid === station.stationuuid)) return prev;
      if (prev.length >= MAX_QUEUE_SIZE) return prev;
      return [...prev, station];
    });
  }, []);

  const addNext = useCallback((station: Station) => {
    setQueue(prev => {
      const filtered = prev.filter(s => s.stationuuid !== station.stationuuid);
      if (filtered.length >= MAX_QUEUE_SIZE) return prev;
      const insertAt = currentIndex >= 0 ? currentIndex + 1 : 0;
      return [...filtered.slice(0, insertAt), station, ...filtered.slice(insertAt)];
    });
  }, [currentIndex]);

  const remove = useCallback((stationuuid: string) => {
    setQueue(prev => prev.filter(s => s.stationuuid !== stationuuid));
    setCurrentIndex(prev => {
      const idx = queue.findIndex(s => s.stationuuid === stationuuid);
      if (idx < 0) return prev;
      if (idx < prev) return prev - 1;
      if (idx === prev) return -1;
      return prev;
    });
  }, [queue]);

  const clear = useCallback(() => {
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const moveUp = useCallback((stationuuid: string) => {
    setQueue(prev => {
      const idx = prev.findIndex(s => s.stationuuid === stationuuid);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((stationuuid: string) => {
    setQueue(prev => {
      const idx = prev.findIndex(s => s.stationuuid === stationuuid);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, []);

  const skipToNext = useCallback((): Station | null => {
    if (queue.length === 0) return null;
    const nextIdx = currentIndex + 1;
    if (nextIdx >= queue.length) return null;
    setCurrentIndex(nextIdx);
    return queue[nextIdx];
  }, [queue, currentIndex]);

  const skipToPrev = useCallback((): Station | null => {
    if (queue.length === 0 || currentIndex <= 0) return null;
    const prevIdx = currentIndex - 1;
    setCurrentIndex(prevIdx);
    return queue[prevIdx];
  }, [queue, currentIndex]);

  const setPlaying = useCallback((stationuuid: string) => {
    const idx = queue.findIndex(s => s.stationuuid === stationuuid);
    setCurrentIndex(idx);
  }, [queue]);

  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  return {
    queue, currentIndex, add, addNext, remove, clear,
    moveUp, moveDown, skipToNext, skipToPrev, hasNext, hasPrev, setPlaying,
  };
}
