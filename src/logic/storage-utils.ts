/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { safeJsonParse } from './sanitize';
import type { Station, HistoryEntry } from '../components/radio/schemas';
import {
  validateStation,
  validateHistoryEntry,
  validateStations,
  validateHistoryEntries,
} from '../components/radio/schemas';

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
    return safeJsonParse<T>(raw);
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
const MIGRATION_BACKUP_KEY = 'radio-migration-backup';

type MigrationFn = (key: string, rawValue: string) => string;

// Registry of migrations: key is "fromVersion→toVersion", value is array of migration functions
const MIGRATIONS: Record<string, MigrationFn[]> = {
  // Example: migrations from v1 to v2
  '1→2': [
    // No-op migrations for now; add transformations as needed
    (key, raw) => raw,
  ],
};

/**
 * Get the sequence of migration paths needed to go from currentVersion to targetVersion.
 * Example: from '1' to '3' would return ['1→2', '2→3']
 */
function getMigrationPath(currentVersion: string, targetVersion: string): string[] {
  const path: string[] = [];
  let ver = currentVersion;
  const targetNum = parseInt(targetVersion, 10);
  const currentNum = parseInt(ver, 10);

  for (let i = currentNum; i < targetNum; i++) {
    path.push(`${i}→${i + 1}`);
    ver = `${i + 1}`;
  }
  return path;
}

/**
 * Apply migrations to storage data from currentVersion to targetVersion.
 * Implements rollback safety by backing up all keys before migration.
 */
export function ensureStorageVersion(managedKeys: readonly string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === STORAGE_SCHEMA_VERSION) return;

    const currentVersion = stored || '1';
    const migrationPath = getMigrationPath(currentVersion, STORAGE_SCHEMA_VERSION);

    if (migrationPath.length === 0) {
      // Version is the same or newer, just update the stored version
      localStorage.setItem(VERSION_KEY, STORAGE_SCHEMA_VERSION);
      return;
    }

    // Create backup of all managed keys before migration
    const backup: Record<string, string | null> = {};
    for (const key of managedKeys) {
      backup[key] = localStorage.getItem(key);
    }
    localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(backup));

    try {
      // Apply migrations in sequence
      for (const migrationKey of migrationPath) {
        const migrationFns = MIGRATIONS[migrationKey] || [];
        for (const key of managedKeys) {
          const rawValue = localStorage.getItem(key);
          if (rawValue === null) continue;

          // Apply all migration functions for this key
          let migratedValue = rawValue;
          for (const migrationFn of migrationFns) {
            migratedValue = migrationFn(key, migratedValue);
          }

          // Save migrated value back to storage
          localStorage.setItem(key, migratedValue);
          console.log(
            `[Pulse Radio] Migrating storage from v${migrationKey.split('→')[0]} → v${migrationKey.split('→')[1]}: key "${key}" migrated successfully`,
          );
        }
      }

      // Success: update schema version and clean up backup
      localStorage.setItem(VERSION_KEY, STORAGE_SCHEMA_VERSION);
      localStorage.removeItem(MIGRATION_BACKUP_KEY);
    } catch (migrationError) {
      // Rollback: restore all keys from backup
      console.error('[Pulse Radio] Storage migration failed, rolling back:', migrationError);
      try {
        const backupData = JSON.parse(localStorage.getItem(MIGRATION_BACKUP_KEY) || '{}');
        for (const key of managedKeys) {
          const backupValue = backupData[key];
          if (backupValue === null) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, backupValue);
          }
        }
      } catch {
        /* ignore restore errors */
      }
      localStorage.removeItem(MIGRATION_BACKUP_KEY);
      throw migrationError;
    }
  } catch {
    /* ignore in SSR / restricted environments */
  }
}

type StorageValue<T> = {
  value: T;
  _ts: number;
};

/**
 * Updates a storage value using a read-modify-write transaction.
 * This consolidates the pattern and makes it atomic within a single tab,
 * reducing race condition window for cross-tab updates.
 */
export function updateStorage<T>(
  key: string,
  updater: (current: T) => T,
  defaultValue: T,
): T {
  const current = loadFromStorage<T>(key, defaultValue);
  const updated = updater(current);
  saveToStorage(key, updated);
  return updated;
}

/**
 * Wraps a value with a timestamp for last-write-wins conflict resolution.
 * Used internally for cross-tab synchronization.
 */
export function wrapWithTimestamp<T>(value: T): StorageValue<T> {
  return {
    value,
    _ts: Date.now(),
  };
}

/**
 * Unwraps a timestamped value, returning the value and timestamp separately.
 */
export function unwrapTimestamp<T>(
  stored: unknown,
): { value: T; timestamp: number } | null {
  if (
    stored !== null &&
    typeof stored === 'object' &&
    '_ts' in stored &&
    'value' in stored
  ) {
    return {
      value: (stored as StorageValue<T>).value,
      timestamp: (stored as StorageValue<T>)._ts,
    };
  }
  return null;
}

/**
 * For array values, merge on conflict instead of overwriting.
 * Deduplicates by object reference equality.
 */
export function mergeArrays<T>(a: T[], b: T[]): T[] {
  const merged = [...a];
  for (const item of b) {
    if (!merged.includes(item)) {
      merged.push(item);
    }
  }
  return merged;
}

/**
 * BroadcastChannel for cross-tab synchronization.
 * Posts updates to other tabs when storage changes.
 */
let _broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (_broadcastChannel) return _broadcastChannel;
  try {
    _broadcastChannel = new BroadcastChannel('pulse-radio-sync');
    return _broadcastChannel;
  } catch {
    return null;
  }
}

/**
 * Notifies other tabs that a storage key has been updated.
 * Other tabs should re-read the key from localStorage (source of truth).
 */
export function notifyStorageUpdate(key: string): void {
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({
        type: 'storage-updated',
        key,
        timestamp: Date.now(),
      });
    } catch {
      /* channel may not be available */
    }
  }
}

/**
 * Listen for cross-tab storage updates via BroadcastChannel.
 * When a key is updated in another tab, the callback is invoked so
 * the receiver can re-read from localStorage.
 */
export function listenForStorageUpdates(
  callback: (key: string, timestamp: number) => void,
): () => void {
  const channel = getBroadcastChannel();
  if (!channel) return () => {};

  const handler = (event: MessageEvent) => {
    if (
      event.data &&
      event.data.type === 'storage-updated' &&
      event.data.key
    ) {
      callback(event.data.key, event.data.timestamp || Date.now());
    }
  };

  channel.addEventListener('message', handler);
  return () => {
    channel.removeEventListener('message', handler);
  };
}

/**
 * Load and validate station data from storage.
 * Filters out invalid stations gracefully without crashing.
 */
export function loadStationsFromStorage(key: string, defaultValue: Station[] = []): Station[] {
  try {
    const raw = tryLoad(key) ?? _memoryFallback.get(key) ?? null;
    if (!raw) return defaultValue;
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return defaultValue;
    return validateStations(parsed);
  } catch (err) {
    console.warn(`[Pulse Radio] Failed to load stations from storage key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Load and validate history entries from storage.
 * Filters out invalid entries gracefully without crashing.
 */
export function loadHistoryFromStorage(key: string, defaultValue: HistoryEntry[] = []): HistoryEntry[] {
  try {
    const raw = tryLoad(key) ?? _memoryFallback.get(key) ?? null;
    if (!raw) return defaultValue;
    const parsed = safeJsonParse<unknown[]>(raw);
    if (!Array.isArray(parsed)) return defaultValue;
    return validateHistoryEntries(parsed);
  } catch (err) {
    console.warn(`[Pulse Radio] Failed to load history from storage key "${key}":`, err);
    return defaultValue;
  }
}

/**
 * Load and validate a single station from storage.
 * Returns null if validation fails.
 */
export function loadStationFromStorage(key: string, defaultValue: Station | null = null): Station | null {
  try {
    const raw = tryLoad(key) ?? _memoryFallback.get(key) ?? null;
    if (!raw) return defaultValue;
    const parsed = safeJsonParse<unknown>(raw);
    return validateStation(parsed) ?? defaultValue;
  } catch (err) {
    console.warn(`[Pulse Radio] Failed to load station from storage key "${key}":`, err);
    return defaultValue;
  }
}
