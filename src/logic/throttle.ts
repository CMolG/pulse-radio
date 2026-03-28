/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

export interface ThrottledFn<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel(): void;
}

/**
 * Returns a throttled function that executes at most once per `intervalMs`.
 * Leading-edge: fires immediately on first call.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  intervalMs: number,
): ThrottledFn<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastCallTime = 0;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = intervalMs - (now - lastCallTime);

    if (remaining <= 0) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      lastCallTime = now;
      fn(...args);
    } else if (timer === null) {
      timer = setTimeout(() => {
        lastCallTime = Date.now();
        timer = null;
        fn(...args);
      }, remaining);
    }
  };

  throttled.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastCallTime = 0;
  };

  return throttled;
}
