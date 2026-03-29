/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const LS_KEY = 'pulse-wake-timer';

interface WakeTimerOptions {
  /**
   * Called when the alarm fires.
   * NOTE: This only works while the browser tab is open. Background tabs may
   * have throttled timers; the alarm will fire when the tab becomes active.
   */
  onWake: (stationUrl: string) => void;
}

interface WakeTimerState {
  wakeAt: string | null; // HH:MM format
  setWakeAt: (time: string | null) => void;
  stationUrl: string;
  setStationUrl: (url: string) => void;
  isScheduled: boolean;
  cancel: () => void;
}

function loadSaved(): { wakeAt: string | null; stationUrl: string } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { wakeAt: null, stationUrl: '' };
    return JSON.parse(raw);
  } catch {
    return { wakeAt: null, stationUrl: '' };
  }
}

function msUntilTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  // If target time is in the past today, schedule for tomorrow
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export function useWakeTimer(opts: WakeTimerOptions): WakeTimerState {
  const saved = loadSaved();
  const [wakeAt, setWakeAtState] = useState<string | null>(saved.wakeAt);
  const [stationUrl, setStationUrlState] = useState(saved.stationUrl);
  const [isScheduled, setIsScheduled] = useState(saved.wakeAt !== null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setWakeAtState(null);
    setIsScheduled(false);
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, [cleanup]);

  const scheduleAlarm = useCallback(
    (time: string, url: string) => {
      cleanup();
      const delayMs = msUntilTime(time);
      timeoutRef.current = setTimeout(() => {
        optsRef.current.onWake(url);
        cancel();
      }, delayMs);
    },
    [cleanup, cancel],
  );

  const setWakeAt = useCallback(
    (time: string | null) => {
      cleanup();
      setWakeAtState(time);
      if (time === null) {
        cancel();
        return;
      }
      setIsScheduled(true);
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({ wakeAt: time, stationUrl }));
      } catch {}
      scheduleAlarm(time, stationUrl);
    },
    [cleanup, cancel, stationUrl, scheduleAlarm],
  );

  const setStationUrl = useCallback(
    (url: string) => {
      setStationUrlState(url);
      if (wakeAt) {
        try {
          localStorage.setItem(LS_KEY, JSON.stringify({ wakeAt, stationUrl: url }));
        } catch {}
      }
    },
    [wakeAt],
  );

  // Resume from saved state on mount
  useEffect(() => {
    if (saved.wakeAt && saved.stationUrl) {
      scheduleAlarm(saved.wakeAt, saved.stationUrl);
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { wakeAt, setWakeAt, stationUrl, setStationUrl, isScheduled, cancel };
}
