/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

const STORAGE_KEY = 'radio-playback-positions';
const MAX_ENTRIES = 100;
const SAVE_INTERVAL_MS = 5_000;

type PositionMap = Record<string, { position: number; duration: number; updatedAt: number }>;

export type UsePlaybackPositionReturn = {
  /** Get saved position for a URL (seconds) */
  getPosition: (url: string) => number;
  /** Save current position for a URL */
  savePosition: (url: string, position: number, duration: number) => void;
  /** Clear saved position for a URL */
  clearPosition: (url: string) => void;
  /** Start auto-saving position from an audio element */
  startTracking: (url: string, audio: HTMLAudioElement) => void;
  /** Stop auto-saving */
  stopTracking: () => void;
};

/**
 * Tracks playback position for non-live content (podcasts, audiobooks).
 * Positions are persisted to localStorage and auto-saved every 5 seconds.
 */
export function usePlaybackPosition(): UsePlaybackPositionReturn {
  const positionsRef = useRef<PositionMap>(
    loadFromStorage<PositionMap>(STORAGE_KEY, {})
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackingRef = useRef<{ url: string; audio: HTMLAudioElement } | null>(null);

  const persist = useCallback(() => {
    saveToStorage(STORAGE_KEY, positionsRef.current);
  }, []);

  const getPosition = useCallback((url: string): number => {
    return positionsRef.current[url]?.position || 0;
  }, []);

  const savePosition = useCallback((url: string, position: number, duration: number) => {
    const positions = positionsRef.current;
    positions[url] = { position, duration, updatedAt: Date.now() };

    // Evict oldest entries if over limit — threshold-based, no full sort
    const keys = Object.keys(positions);
    if (keys.length > MAX_ENTRIES) {
      const excess = keys.length - MAX_ENTRIES;
      const timestamps = new Float64Array(keys.length);
      for (let i = 0; i < keys.length; i++) timestamps[i] = positions[keys[i]].updatedAt || 0;
      timestamps.sort();
      const threshold = timestamps[excess - 1];
      let removed = 0;
      for (let i = 0; i < keys.length && removed < excess; i++) {
        if ((positions[keys[i]].updatedAt || 0) <= threshold) {
          delete positions[keys[i]];
          removed++;
        }
      }
    }
    persist();
  }, [persist]);

  const clearPosition = useCallback((url: string) => {
    delete positionsRef.current[url];
    persist();
  }, [persist]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // Final save on stop
    if (trackingRef.current) {
      const { url, audio } = trackingRef.current;
      if (audio.currentTime > 0 && isFinite(audio.duration)) {
        savePosition(url, audio.currentTime, audio.duration);
      }
    }
    trackingRef.current = null;
  }, [savePosition]);

  const startTracking = useCallback((url: string, audio: HTMLAudioElement) => {
    stopTracking();
    trackingRef.current = { url, audio };

    intervalRef.current = setInterval(() => {
      if (audio.paused || !isFinite(audio.currentTime) || !isFinite(audio.duration)) return;
      savePosition(url, audio.currentTime, audio.duration);
    }, SAVE_INTERVAL_MS);
  }, [stopTracking, savePosition]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (trackingRef.current) {
      const { url, audio } = trackingRef.current;
      if (audio.currentTime > 0 && isFinite(audio.duration)) {
        savePosition(url, audio.currentTime, audio.duration);
      }
    }
  }, [savePosition]);

  return { getPosition, savePosition, clearPosition, startTracking, stopTracking };
}
