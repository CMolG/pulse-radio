import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cacheGet,
  cacheSet,
  cacheHas,
  cacheDelete,
  isStationBlacklisted,
  recordStationFailure,
  clearStationFailures,
} from '../server-cache';

beforeEach(() => {
  // Clear all namespaces by deleting known keys
  for (const ns of [
    'itunes',
    'artist-info',
    'concerts',
    'lyrics',
    'station-blacklist',
  ] as const) {
    // We can't access internal stores, but we can verify fresh state via cacheGet
    cacheDelete(ns, '__test__');
  }
});

describe('server-cache', () => {
  it('round-trips values with cacheSet / cacheGet', () => {
    cacheSet('itunes', 'key1', { artist: 'test' }, 60_000);
    expect(cacheGet('itunes', 'key1')).toEqual({ artist: 'test' });
  });

  it('returns undefined for missing keys', () => {
    expect(cacheGet('itunes', 'nonexistent')).toBeUndefined();
  });

  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    cacheSet('lyrics', 'song1', 'lyrics text', 1000);
    expect(cacheGet('lyrics', 'song1')).toBe('lyrics text');

    vi.advanceTimersByTime(1001);
    expect(cacheGet('lyrics', 'song1')).toBeUndefined();
    vi.useRealTimers();
  });

  it('cacheHas returns true for valid and false for expired', () => {
    vi.useFakeTimers();
    cacheSet('concerts', 'band1', { dates: [] }, 500);
    expect(cacheHas('concerts', 'band1')).toBe(true);

    vi.advanceTimersByTime(501);
    expect(cacheHas('concerts', 'band1')).toBe(false);
    vi.useRealTimers();
  });

  it('namespaces are isolated', () => {
    cacheSet('itunes', 'shared-key', 'itunes-value', 60_000);
    cacheSet('lyrics', 'shared-key', 'lyrics-value', 60_000);
    expect(cacheGet('itunes', 'shared-key')).toBe('itunes-value');
    expect(cacheGet('lyrics', 'shared-key')).toBe('lyrics-value');
  });

  it('cacheDelete removes entries', () => {
    cacheSet('artist-info', 'del-me', 'data', 60_000);
    expect(cacheGet('artist-info', 'del-me')).toBe('data');
    cacheDelete('artist-info', 'del-me');
    expect(cacheGet('artist-info', 'del-me')).toBeUndefined();
  });

  describe('station blacklist', () => {
    it('station is not blacklisted before threshold', () => {
      const url = 'http://test-station.example.com/stream';
      recordStationFailure(url);
      recordStationFailure(url);
      expect(isStationBlacklisted(url)).toBe(false);
    });

    it('station becomes blacklisted at threshold (3 failures)', () => {
      const url = 'http://blacklist-test.example.com/stream';
      recordStationFailure(url);
      recordStationFailure(url);
      const nowBlacklisted = recordStationFailure(url);
      expect(nowBlacklisted).toBe(true);
      expect(isStationBlacklisted(url)).toBe(true);
    });

    it('clearStationFailures removes blacklist', () => {
      const url = 'http://clear-test.example.com/stream';
      recordStationFailure(url);
      recordStationFailure(url);
      recordStationFailure(url);
      expect(isStationBlacklisted(url)).toBe(true);
      clearStationFailures(url);
      expect(isStationBlacklisted(url)).toBe(false);
    });
  });
});
