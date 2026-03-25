/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const PRESETS_MIN = [15, 30, 60] as const;
const FADE_DURATION_MS = 30_000; // fade volume over last 30 seconds
export function useSleepTimer(onExpire: () => void, audioRef?: React.RefObject<HTMLAudioElement | null>) {
  const [remainingMin, setRemainingMin] = useState<number | null>(null);
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const endTimeRef = useRef<number>(0);
  const savedVolumeRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

  const stopFade = useCallback(() => {
    if (fadeTimerRef.current) { clearInterval(fadeTimerRef.current); fadeTimerRef.current = null; }
    // Restore original volume if we saved it
    if (savedVolumeRef.current !== null && audioRef?.current) {
      audioRef.current.volume = savedVolumeRef.current; savedVolumeRef.current = null;
    }
    setIsFading(false);
  }, []);

  const clear = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopFade();
    endTimeRef.current = 0;
    setRemainingMin(null);
  }, [stopFade]);

  const startFade = useCallback(() => {
    if (!audioRef?.current || fadeTimerRef.current) return; const audio = audioRef.current;
    savedVolumeRef.current = audio.volume;
    setIsFading(true);

    const fadeStart = Date.now();
    let baseVol = audio.volume;
    let lastSetVol = audio.volume;
    fadeTimerRef.current = setInterval(() => {
      // Detect external volume changes (user adjusted volume during fade).
      // Check both directions — user may have raised or lowered the volume.
      if (Math.abs(audio.volume - lastSetVol) > 0.01) { baseVol = audio.volume; savedVolumeRef.current = baseVol; }
      const elapsed = Date.now() - fadeStart;
      const progress = Math.min(1, elapsed / FADE_DURATION_MS);
      // Ease-out quadratic for gentle fade
      const factor = 1 - progress * progress; const target = Math.max(0, baseVol * factor);
      audio.volume = target;
      lastSetVol = target;
      if (progress >= 1) { clearInterval(fadeTimerRef.current!); fadeTimerRef.current = null; }
    }, 200);
  }, []);

  const start = useCallback((minutes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    stopFade();
    endTimeRef.current = Date.now() + minutes * 60_000;
    setRemainingMin(minutes);

    timerRef.current = setInterval(() => {
      const left = Math.max(0, endTimeRef.current - Date.now());
      const mins = Math.ceil(left / 60_000);
      if (left <= 0) {
        // Discard saved volume so stopFade won't restore it — the
        // fade brought volume to 0 intentionally before pausing.
        savedVolumeRef.current = null;
        clear();
        onExpireRef.current();
      } else {
        setRemainingMin(mins);
        // Start fading volume when less than FADE_DURATION_MS remains
        if (left <= FADE_DURATION_MS && audioRef?.current && !fadeTimerRef.current) startFade();
      }
    }, 1000); // check every second for smooth fade timing
  }, [clear, stopFade, startFade]);

  const cycle = useCallback(() => {
    if (remainingMin === null) {
      start(PRESETS_MIN[0]);
    } else {
      const currentIdx = PRESETS_MIN.findIndex(p => p >= remainingMin);
      const nextIdx = currentIdx + 1;
      if (nextIdx < PRESETS_MIN.length) start(PRESETS_MIN[nextIdx]);
      else clear();
    }
  }, [remainingMin, start, clear]);

  // Cleanup on unmount
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
  }, []);

  return { remainingMin, isFading, cycle, cancel: clear };
}
