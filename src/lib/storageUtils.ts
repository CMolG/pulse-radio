/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { safeJsonParse } from './sanitize';

const _memoryFallback = new Map<string, string>();

/** Detect whether localStorage is functional (false in private/incognito on some browsers). */
export function isStorageAvailable(): boolean {
  try {
    const testKey = '__pulse_storage_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

let _storageAvailable: boolean | null = null;
function getCachedAvailability(): boolean {
  if (_storageAvailable === null) {
    _storageAvailable = typeof window !== 'undefined' && isStorageAvailable();
  }
  return _storageAvailable;
}

/** Indicates whether data persists across sessions or is memory-only (e.g. private mode). */
export function storageMode(): 'persistent' | 'memory-only' {
  return getCachedAvailability() ? 'persistent' : 'memory-only';
}

function tryLoad(
  key: string,
): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function isQuotaExceeded(e: unknown): boolean {
  return (
    e instanceof DOMException &&
    (e.name === 'QuotaExceededError' || (e as DOMException).code === 22)
  );
}
function trySave(key: string, raw: string): boolean {
  try {
    localStorage.setItem(key, raw);
    return true;
  } catch (e) {
    if (isQuotaExceeded(e))
      console.warn(`[Pulse Radio] localStorage quota exceeded for key "${key}"`);
    return false;
  }
}
/** Load a JSON value from localStorage with a fallback default */ export function loadFromStorage<
  T,
>(key: string, defaultValue: T): T {
  const raw = tryLoad(key) ?? _memoryFallback.get(key) ?? null;
  if (!raw) return defaultValue;
  try {
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}
/** Save a JSON value to localStorage. Returns false if quota is exceeded. */ export function saveToStorage<T>(key: string, value: T): boolean {
  const raw = JSON.stringify(value);
  const saved = trySave(key, raw);
  if (!saved) {
    _memoryFallback.set(key, raw);
    return false;
  }
  return true;
}
/** Load a plain string value from localStorage with fallback */ export const loadStringFromStorage =
  (key: string, defaultValue = '') => tryLoad(key) ?? _memoryFallback.get(key) ?? defaultValue;
/** Save a plain string value to localStorage. Returns false if quota is exceeded. */ export function saveStringToStorage(key: string, value: string): boolean {
  const saved = trySave(key, value);
  if (!saved) {
    _memoryFallback.set(key, value);
    return false;
  }
  return true;
}
const STORAGE_SCHEMA_VERSION = '1';
const VERSION_KEY = 'radio-schema-version';
export function ensureStorageVersion(managedKeys: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === STORAGE_SCHEMA_VERSION) return;
    for (const key of managedKeys) {
      localStorage.removeItem(key);
    }
    localStorage.setItem(VERSION_KEY, STORAGE_SCHEMA_VERSION);
  } catch {
    /* ignore in SSR / restricted environments */
  }
}
