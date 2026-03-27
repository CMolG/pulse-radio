/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const LS_KEY = 'pulse-sleep-timer';
const FADE_DURATION_S = 30;

export type SleepMinutes = 15 | 30 | 45 | 60 | 90 | 120 | null;

interface SleepTimerOptions {
  /** Called when the timer expires (stop playback). */
  onSleep: () => void;
  /** Called during fade-out with volume 0.0–1.0. Optional. */
  onVolumeFade?: (volume: number) => void;
}

interface SleepTimerState {
  sleepIn: SleepMinutes;
  setSleepIn: (minutes: SleepMinutes) => void;
  remainingSeconds: number;
  isActive: boolean;
  cancel: () => void;
}

function loadSaved(): { sleepIn: SleepMinutes; expiresAt: number | null } {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { sleepIn: null, expiresAt: null };
    const parsed = JSON.parse(raw);
    if (parsed.expiresAt && parsed.expiresAt > Date.now()) {
      return { sleepIn: parsed.sleepIn, expiresAt: parsed.expiresAt };
    }
    localStorage.removeItem(LS_KEY);
  } catch {}
  return { sleepIn: null, expiresAt: null };
}

export function useSleepTimer(opts: SleepTimerOptions): SleepTimerState {
  const saved = loadSaved();
  const [sleepIn, setSleepInState] = useState<SleepMinutes>(saved.sleepIn);
  const [remainingSeconds, setRemainingSeconds] = useState(
    saved.expiresAt ? Math.max(0, Math.round((saved.expiresAt - Date.now()) / 1000)) : 0,
  );
  const [isActive, setIsActive] = useState(saved.sleepIn !== null);

  const expiresAtRef = useRef<number | null>(saved.expiresAt);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setSleepInState(null);
    setRemainingSeconds(0);
    setIsActive(false);
    expiresAtRef.current = null;
    try { localStorage.removeItem(LS_KEY); } catch {}
  }, [cleanup]);

  const setSleepIn = useCallback((minutes: SleepMinutes) => {
    cleanup();
    if (minutes === null) {
      cancel();
      return;
    }

    const expiresAt = Date.now() + minutes * 60 * 1000;
    expiresAtRef.current = expiresAt;
    setSleepInState(minutes);
    setRemainingSeconds(minutes * 60);
    setIsActive(true);

    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ sleepIn: minutes, expiresAt }));
    } catch {}

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((expiresAtRef.current! - Date.now()) / 1000));
      setRemainingSeconds(remaining);

      // Fade volume during last 30 seconds
      if (remaining <= FADE_DURATION_S && remaining > 0) {
        const volume = remaining / FADE_DURATION_S;
        optsRef.current.onVolumeFade?.(volume);
      }

      if (remaining <= 0) {
        optsRef.current.onSleep();
        cancel();
      }
    }, 1000);
  }, [cleanup, cancel]);

  // Resume from saved state on mount
  useEffect(() => {
    if (saved.expiresAt && saved.sleepIn) {
      const remaining = Math.max(0, Math.round((saved.expiresAt - Date.now()) / 1000));
      if (remaining > 0) {
        expiresAtRef.current = saved.expiresAt;
        intervalRef.current = setInterval(() => {
          const rem = Math.max(0, Math.round((expiresAtRef.current! - Date.now()) / 1000));
          setRemainingSeconds(rem);
          if (rem <= FADE_DURATION_S && rem > 0) {
            optsRef.current.onVolumeFade?.(rem / FADE_DURATION_S);
          }
          if (rem <= 0) {
            optsRef.current.onSleep();
            cancel();
          }
        }, 1000);
      } else {
        cancel();
      }
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { sleepIn, setSleepIn, remainingSeconds, isActive, cancel };
}
