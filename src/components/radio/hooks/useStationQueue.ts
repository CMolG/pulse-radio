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
  // Ref tracks latest queue so callbacks avoid stale closures
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

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
      // Read currentIndex via updater to avoid stale closure
      return filtered;
    });
    // Re-insert at correct position using current state
    setCurrentIndex(prevIdx => {
      const filtered = queueRef.current.filter(s => s.stationuuid !== station.stationuuid);
      const insertAt = prevIdx >= 0 ? Math.min(prevIdx + 1, filtered.length) : 0;
      setQueue([...filtered.slice(0, insertAt), station, ...filtered.slice(insertAt)]);
      return prevIdx;
    });
  }, []);

  const remove = useCallback((stationuuid: string) => {
    let removedIdx = -1;
    setQueue(prev => {
      removedIdx = prev.findIndex(s => s.stationuuid === stationuuid);
      return prev.filter(s => s.stationuuid !== stationuuid);
    });
    setCurrentIndex(prev => {
      if (removedIdx < 0) return prev;
      if (removedIdx < prev) return prev - 1;
      if (removedIdx === prev) return -1;
      return prev;
    });
  }, []);

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
    const q = queueRef.current;
    if (q.length === 0) return null;
    let result: Station | null = null;
    setCurrentIndex(prev => {
      const nextIdx = prev + 1;
      if (nextIdx >= queueRef.current.length) return prev;
      result = queueRef.current[nextIdx];
      return nextIdx;
    });
    return result;
  }, []);

  const skipToPrev = useCallback((): Station | null => {
    const q = queueRef.current;
    if (q.length === 0) return null;
    let result: Station | null = null;
    setCurrentIndex(prev => {
      if (prev <= 0) return prev;
      const prevIdx = prev - 1;
      result = queueRef.current[prevIdx];
      return prevIdx;
    });
    return result;
  }, []);

  const setPlaying = useCallback((stationuuid: string) => {
    const idx = queueRef.current.findIndex(s => s.stationuuid === stationuuid);
    setCurrentIndex(idx);
  }, []);

  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;

  return {
    queue, currentIndex, add, addNext, remove, clear,
    moveUp, moveDown, skipToNext, skipToPrev, hasNext, hasPrev, setPlaying,
  };
}
