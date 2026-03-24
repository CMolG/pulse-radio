/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

/** Load a JSON value from localStorage with a fallback default */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return defaultValue;
}

function isQuotaExceeded(e: unknown): boolean {
  return e instanceof DOMException && (e.name === 'QuotaExceededError' || (e as DOMException).code === 22);
}

/** Save a JSON value to localStorage. Returns false if quota is exceeded. */
export function saveToStorage<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) console.warn(`[Pulse Radio] localStorage quota exceeded for key "${key}"`);
    return false;
  }
}

/** Load a plain string value from localStorage with fallback */
export function loadStringFromStorage(key: string, defaultValue = ""): string {
  if (typeof window === "undefined") return defaultValue;
  try {
    const raw = localStorage.getItem(key);
    return raw ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/** Save a plain string value to localStorage. Returns false if quota is exceeded. */
export function saveStringToStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (isQuotaExceeded(e)) console.warn(`[Pulse Radio] localStorage quota exceeded for key "${key}"`);
    return false;
  }
}

/**
 * Storage schema version. Bump this when data structures change in a
 * backwards-incompatible way. On mismatch, stale keys are cleared so
 * the app can re-initialize cleanly instead of crashing on malformed data.
 */
const STORAGE_SCHEMA_VERSION = 1;
const VERSION_KEY = 'radio-schema-version';

export function ensureStorageVersion(managedKeys: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    const current = String(STORAGE_SCHEMA_VERSION);
    if (stored === current) return;

    // Version mismatch — clear managed keys to prevent stale data crashes
    for (const key of managedKeys) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(VERSION_KEY, current);
  } catch { /* ignore in SSR / restricted environments */ }
}
