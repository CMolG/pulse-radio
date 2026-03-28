import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFromStorage,
  saveToStorage,
  loadStringFromStorage,
  saveStringToStorage,
  loadHistoryFromStorage,
  ensureStorageVersion,
  updateStorage,
  wrapWithTimestamp,
  unwrapTimestamp,
  mergeArrays,
  listenForStorageUpdates,
  notifyStorageUpdate,
} from '../storageUtils';

const store = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store.set(key, value);
  }),
  removeItem: vi.fn((key: string) => {
    store.delete(key);
  }),
  clear: vi.fn(() => store.clear()),
  get length() {
    return store.size;
  },
  key: vi.fn((_i: number) => null),
};

beforeEach(() => {
  store.clear();
  vi.restoreAllMocks();
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

describe('storageUtils', () => {
  describe('saveToStorage / loadFromStorage', () => {
    it('round-trips JSON values', () => {
      const result = saveToStorage('test-key', { foo: 'bar', n: 42 });
      expect(result).toBe(true);
      expect(loadFromStorage('test-key', null)).toEqual({ foo: 'bar', n: 42 });
    });

    it('returns default when key is missing', () => {
      expect(loadFromStorage('missing', 'fallback')).toBe('fallback');
    });

    it('returns default when stored value is invalid JSON', () => {
      store.set('bad-json', '{invalid');
      expect(loadFromStorage('bad-json', [])).toEqual([]);
    });

    it('returns false on quota exceeded', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        const err = new DOMException('quota exceeded', 'QuotaExceededError');
        throw err;
      });
      expect(saveToStorage('full', 'data')).toBe(false);
    });
  });

  describe('loadHistoryFromStorage', () => {
    it('loads valid history entries', () => {
      const valid = [
        {
          id: 'h1',
          stationName: 'Station One',
          stationUuid: 'uuid-1',
          artist: 'Artist',
          title: 'Song',
          timestamp: Date.now(),
        },
      ];
      store.set('radio-history', JSON.stringify(valid));
      expect(loadHistoryFromStorage('radio-history', [])).toEqual(valid);
    });

    it('normalizes legacy stationuuid field while filtering malformed entries', () => {
      const mixed = [
        {
          id: 'legacy-1',
          stationName: 'Legacy Station',
          stationuuid: 'legacy-uuid',
          artist: 'Legacy Artist',
          title: 'Legacy Song',
          timestamp: Date.now(),
        },
        {
          id: 'invalid-1',
          stationName: 'Invalid Station',
          stationUuid: 'bad-uuid',
          artist: '',
          title: 'Missing Artist',
          timestamp: Date.now(),
        },
      ];
      store.set('radio-history', JSON.stringify(mixed));
      const loaded = loadHistoryFromStorage('radio-history', []);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('legacy-1');
      expect(loaded[0].stationUuid).toBe('legacy-uuid');
    });
  });

  describe('saveStringToStorage / loadStringFromStorage', () => {
    it('saves and loads plain strings', () => {
      saveStringToStorage('lang', 'en');
      expect(loadStringFromStorage('lang')).toBe('en');
    });

    it('returns empty string default for missing keys', () => {
      expect(loadStringFromStorage('nope')).toBe('');
    });
  });

  describe('ensureStorageVersion', () => {
    it('clears managed keys when version mismatches', () => {
      store.set('radio-favorites', '[1,2,3]');
      store.set('radio-history', '[]');
      store.set('unmanaged', 'keep');
      ensureStorageVersion(['radio-favorites', 'radio-history']);
      expect(store.has('radio-favorites')).toBe(false);
      expect(store.has('radio-history')).toBe(false);
      expect(store.get('unmanaged')).toBe('keep');
      expect(store.get('radio-schema-version')).toBe('1');
    });

    it('does not clear when version matches', () => {
      store.set('radio-schema-version', '1');
      store.set('radio-favorites', 'keep');
      ensureStorageVersion(['radio-favorites']);
      expect(store.get('radio-favorites')).toBe('keep');
    });
  });

  describe('SSR safety', () => {
    it('returns defaults when window is undefined', () => {
      Object.defineProperty(globalThis, 'window', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      expect(loadFromStorage('key', 'default')).toBe('default');
      expect(loadStringFromStorage('key', 'def')).toBe('def');
    });
  });

  describe('updateStorage (read-modify-write transaction)', () => {
    it('consolidates read-modify-write into single synchronous block', () => {
      saveToStorage('counter', { count: 5 });
      const result = updateStorage('counter', (current) => {
        return { count: current.count + 1 };
      }, { count: 0 });
      expect(result).toEqual({ count: 6 });
      expect(loadFromStorage('counter', null)).toEqual({ count: 6 });
    });

    it('uses default value when key is missing', () => {
      const result = updateStorage('newkey', (current) => {
        return current + 1;
      }, 0);
      expect(result).toBe(1);
      expect(loadFromStorage('newkey', null)).toBe(1);
    });
  });

  describe('wrapWithTimestamp / unwrapTimestamp', () => {
    it('wraps value with current timestamp', () => {
      const value = { foo: 'bar' };
      const wrapped = wrapWithTimestamp(value);
      expect(wrapped.value).toEqual(value);
      expect(wrapped._ts).toBeGreaterThan(0);
      expect(wrapped._ts).toBeLessThanOrEqual(Date.now());
    });

    it('unwraps timestamped value', () => {
      const value = { foo: 'bar' };
      const wrapped = wrapWithTimestamp(value);
      const unwrapped = unwrapTimestamp(wrapped);
      expect(unwrapped).not.toBeNull();
      expect(unwrapped?.value).toEqual(value);
      expect(unwrapped?.timestamp).toBe(wrapped._ts);
    });

    it('returns null for non-timestamped values', () => {
      expect(unwrapTimestamp({ foo: 'bar' })).toBeNull();
      expect(unwrapTimestamp('plain-string')).toBeNull();
      expect(unwrapTimestamp(null)).toBeNull();
    });
  });

  describe('mergeArrays (union with deduplication)', () => {
    it('merges two arrays without duplicates', () => {
      const a = ['x', 'y'];
      const b = ['y', 'z'];
      expect(mergeArrays(a, b)).toEqual(['x', 'y', 'z']);
    });

    it('preserves order from first array', () => {
      const a = [1, 2, 3];
      const b = [2, 3, 4];
      expect(mergeArrays(a, b)).toEqual([1, 2, 3, 4]);
    });

    it('handles empty arrays', () => {
      expect(mergeArrays([], [1, 2])).toEqual([1, 2]);
      expect(mergeArrays([1, 2], [])).toEqual([1, 2]);
    });

    it('deduplicates objects by reference', () => {
      const obj = { id: 1 };
      expect(mergeArrays([obj], [obj])).toEqual([obj]);
    });
  });

  describe('BroadcastChannel cross-tab sync', () => {
    it('notifyStorageUpdate handles missing BroadcastChannel gracefully', () => {
      Object.defineProperty(globalThis, 'BroadcastChannel', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      // Should not throw
      expect(() => notifyStorageUpdate('test-key')).not.toThrow();
    });

    it('listenForStorageUpdates returns unsubscribe function when BroadcastChannel unavailable', () => {
      Object.defineProperty(globalThis, 'BroadcastChannel', {
        value: undefined,
        writable: true,
        configurable: true,
      });
      const callback = vi.fn();
      const unsubscribe = listenForStorageUpdates(callback);
      expect(typeof unsubscribe).toBe('function');
      // Should not throw
      expect(() => unsubscribe()).not.toThrow();
    });
  });
});
