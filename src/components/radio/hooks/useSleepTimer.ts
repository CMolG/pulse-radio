/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const PRESETS_MIN = [15, 30, 60] as const;

export type UseSleepTimerReturn = {
  /** Minutes remaining (null = inactive) */
  remainingMin: number | null;
  /** Cycle through presets: off → 15 → 30 → 60 → off */
  cycle: () => void;
  /** Cancel active timer */
  cancel: () => void;
};

export function useSleepTimer(onExpire: () => void): UseSleepTimerReturn {
  const [remainingMin, setRemainingMin] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    endTimeRef.current = 0;
    setRemainingMin(null);
  }, []);

  const start = useCallback((minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    endTimeRef.current = Date.now() + minutes * 60_000;
    setRemainingMin(minutes);

    timerRef.current = setInterval(() => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      const mins = Math.ceil(left / 60_000);
      if (left <= 0) {
        clear();
        onExpireRef.current();
      } else {
        setRemainingMin(mins);
      }
    }, 10_000); // update every 10s
  }, [clear]);

  const cycle = useCallback(() => {
    if (remainingMin === null) {
      start(PRESETS_MIN[0]);
    } else {
      const currentIdx = PRESETS_MIN.findIndex(p => p >= remainingMin);
      const nextIdx = currentIdx + 1;
      if (nextIdx < PRESETS_MIN.length) {
        start(PRESETS_MIN[nextIdx]);
      } else {
        clear();
      }
    }
  }, [remainingMin, start, clear]);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { remainingMin, cycle, cancel: clear };
}
