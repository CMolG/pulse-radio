import { useEffect } from 'react';

/** Sync state from cross-tab StorageEvents for a given key. */
export function useStorageSync<T>(
  key: string,
  setter: (val: T) => void,
  validate: (v: unknown) => boolean = Array.isArray,
): void {
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (validate(parsed)) setter(parsed as T);
      } catch { /* ignore malformed */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
