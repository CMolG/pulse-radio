import { useEffect, useRef } from 'react';
/** Sync state from cross-tab StorageEvents for a given key. */
export function useStorageSync<T>( key: string, setter: (val: T) => void,
  validate: (v: unknown) => boolean = Array.isArray,
): void { const setterRef = useRef(setter); const validateRef = useRef(validate);
  setterRef.current = setter; validateRef.current = validate;
  useEffect(() => { const onStorage = (e: StorageEvent) => {
      if (e.key !== key || e.newValue == null) return;
      try { const parsed = JSON.parse(e.newValue); if (validateRef.current(parsed)) setterRef.current(parsed as T);
      } catch { /* ignore malformed */ }
    }; window.addEventListener('storage', onStorage); return () => window.removeEventListener('storage', onStorage);
  }, [key]); }
