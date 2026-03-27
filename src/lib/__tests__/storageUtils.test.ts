import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadFromStorage,
  saveToStorage,
  loadStringFromStorage,
  saveStringToStorage,
  ensureStorageVersion,
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
});
