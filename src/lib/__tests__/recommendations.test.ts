import { describe, it, expect } from 'vitest';
import { extractTopTags, scoreStation } from '../../hooks/useSmartRecommendations';
import type { Station } from '@/components/radio/constants';

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    stationuuid: '1',
    name: 'Test',
    url_resolved: 'http://test.com',
    favicon: '',
    country: 'US',
    countrycode: 'US',
    tags: '',
    votes: 0,
    codec: 'MP3',
    bitrate: 128,
    ...overrides,
  };
}

describe('extractTopTags', () => {
  it('extracts top tags by frequency', () => {
    const stations = [
      makeStation({ tags: 'jazz,blues,lofi' }),
      makeStation({ tags: 'jazz,rock' }),
      makeStation({ tags: 'jazz,blues' }),
    ];
    const top = extractTopTags(stations, 3);
    expect(top[0]).toBe('jazz');
    expect(top[1]).toBe('blues');
    expect(top).toHaveLength(3);
  });

  it('returns empty for no tags', () => {
    expect(extractTopTags([])).toEqual([]);
  });
});

describe('scoreStation', () => {
  it('scores by tag overlap', () => {
    const s = makeStation({ tags: 'jazz,blues', votes: 0 });
    const score = scoreStation(s, new Set(['jazz', 'rock']));
    expect(score).toBeGreaterThan(0);
  });

  it('adds popularity bonus', () => {
    const lowVotes = makeStation({ tags: 'jazz', votes: 10 });
    const highVotes = makeStation({ tags: 'jazz', votes: 1000 });
    const s1 = scoreStation(lowVotes, new Set(['jazz']));
    const s2 = scoreStation(highVotes, new Set(['jazz']));
    expect(s2).toBeGreaterThan(s1);
  });

  it('returns 0 for no tag overlap', () => {
    const s = makeStation({ tags: 'classical', votes: 0, bitrate: 64 });
    const score = scoreStation(s, new Set(['jazz']));
    expect(score).toBe(0);
  });
});
