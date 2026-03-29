/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import type { Station } from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';

const MAX_QUEUE_SIZE = 20;

export function useStationQueue() {
  const [queue, setQueue] = useState<Station[]>(() =>
    loadFromStorage<Station[]>(STORAGE_KEYS.STATION_QUEUE, []),
  );
  const [currentIndex, setCurrentIndex] = useState(-1);
  const persistRef = useRef(false);
  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    if (persistRef.current) saveToStorage(STORAGE_KEYS.STATION_QUEUE, queue);
    persistRef.current = true;
  }, [queue]);
  const add = useCallback((station: Station) => {
    setQueue((prev) => {
      if (prev.some((s) => s.stationuuid === station.stationuuid)) return prev;
      if (prev.length >= MAX_QUEUE_SIZE) return prev;
      return [...prev, station];
    });
  }, []);
  const addNext = useCallback((station: Station) => {
    let removedIdx = -1;
    setCurrentIndex((prevIdx) => {
      const q = queueRef.current;
      removedIdx = -1;
      const filtered: Station[] = [];
      for (let i = 0; i < q.length; i++) {
        if (q[i].stationuuid === station.stationuuid) {
          removedIdx = i;
        } else {
          filtered.push(q[i]);
        }
      }
      if (removedIdx < 0 && filtered.length >= MAX_QUEUE_SIZE) return prevIdx;
      let adjusted = prevIdx;
      if (removedIdx >= 0 && removedIdx < prevIdx) adjusted--;
      const insertAt = adjusted >= 0 ? Math.min(adjusted + 1, filtered.length) : 0;
      filtered.splice(insertAt, 0, station);
      setQueue(filtered);
      return adjusted;
    });
  }, []);
  const remove = useCallback((stationuuid: string) => {
    let removedIdx = -1;
    setQueue((prev) => {
      const result: Station[] = [];
      removedIdx = -1;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i].stationuuid === stationuuid) {
          removedIdx = i;
        } else {
          result.push(prev[i]);
        }
      }
      return removedIdx < 0 ? prev : result;
    });
    setCurrentIndex((prev) => {
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
    let movedIdx = -1;
    setQueue((prev) => {
      const idx = prev.findIndex((s) => s.stationuuid === stationuuid);
      if (idx <= 0) return prev;
      movedIdx = idx;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    setCurrentIndex((prev) => {
      if (movedIdx < 0) return prev;
      if (prev === movedIdx) return movedIdx - 1;
      if (prev === movedIdx - 1) return movedIdx;
      return prev;
    });
  }, []);
  const moveDown = useCallback((stationuuid: string) => {
    let movedIdx = -1;
    setQueue((prev) => {
      const idx = prev.findIndex((s) => s.stationuuid === stationuuid);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      movedIdx = idx;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    setCurrentIndex((prev) => {
      if (movedIdx < 0) return prev;
      if (prev === movedIdx) return movedIdx + 1;
      if (prev === movedIdx + 1) return movedIdx;
      return prev;
    });
  }, []);
  const skipToNext = useCallback((): Station | null => {
    const q = queueRef.current;
    if (q.length === 0) return null;
    let result: Station | null = null;
    setCurrentIndex((prev) => {
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
    setCurrentIndex((prev) => {
      if (prev <= 0) return prev;
      const prevIdx = prev - 1;
      result = queueRef.current[prevIdx];
      return prevIdx;
    });
    return result;
  }, []);
  const setPlaying = useCallback((stationuuid: string) => {
    const idx = queueRef.current.findIndex((s) => s.stationuuid === stationuuid);
    setCurrentIndex(idx);
  }, []);
  const hasNext = currentIndex >= 0 && currentIndex < queue.length - 1;
  const hasPrev = currentIndex > 0;
  return {
    queue,
    currentIndex,
    add,
    addNext,
    remove,
    clear,
    moveUp,
    moveDown,
    skipToNext,
    skipToPrev,
    hasNext,
    hasPrev,
    setPlaying,
  };
}
