/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce, type DebouncedFn } from '@/lib/debounce';

/** Returns a debounced version of `value` that only updates after `delayMs` of inactivity. */
export function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Returns a debounced callback that auto-cancels on unmount. */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number,
  deps: any[],
): DebouncedFn<T> {
  const ref = useRef<DebouncedFn<T> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFn = useCallback(
    (() => {
      if (ref.current) ref.current.cancel();
      ref.current = debounce(fn, delayMs);
      return ref.current;
    })(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delayMs, ...deps],
  );

  useEffect(() => {
    return () => {
      ref.current?.cancel();
    };
  }, []);

  return debouncedFn;
}
