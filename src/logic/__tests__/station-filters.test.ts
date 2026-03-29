import { describe, it, expect } from 'vitest';
import { extractFilterOptions } from '@/logic/hooks/useStationFilters';

// We test the pure functions only — hooks need React testing libs
const stations = [
  {
    stationuuid: '1',
    name: 'Rock FM',
    url_resolved: 'http://a.com',
    favicon: '',
    country: 'US',
    countrycode: 'US',
    tags: 'rock,indie',
    votes: 100,
    codec: 'MP3',
    bitrate: 320,
    language: 'english',
  },
  {
    stationuuid: '2',
    name: 'Jazz AAC',
    url_resolved: 'http://b.com',
    favicon: '',
    country: 'FR',
    countrycode: 'FR',
    tags: 'jazz,smooth',
    votes: 50,
    codec: 'AAC',
    bitrate: 192,
    language: 'french',
  },
  {
    stationuuid: '3',
    name: 'Lo-Fi',
    url_resolved: 'http://c.com',
    favicon: '',
    country: 'JP',
    countrycode: 'JP',
    tags: 'lofi,chill',
    votes: 30,
    codec: 'OPUS',
    bitrate: 96,
    language: 'japanese',
  },
];

describe('extractFilterOptions', () => {
  it('extracts unique codecs', () => {
    const opts = extractFilterOptions(stations);
    expect(opts.codecs).toEqual(['AAC', 'MP3', 'OPUS']);
  });

  it('extracts unique languages', () => {
    const opts = extractFilterOptions(stations);
    expect(opts.languages).toContain('english');
    expect(opts.languages).toContain('french');
    expect(opts.languages).toContain('japanese');
  });

  it('extracts tags', () => {
    const opts = extractFilterOptions(stations);
    expect(opts.tags).toContain('rock');
    expect(opts.tags).toContain('jazz');
    expect(opts.tags).toContain('lofi');
  });

  it('calculates bitrate range', () => {
    const opts = extractFilterOptions(stations);
    expect(opts.bitrateRange).toEqual({ min: 96, max: 320 });
  });

  it('handles empty array', () => {
    const opts = extractFilterOptions([]);
    expect(opts.codecs).toEqual([]);
    expect(opts.bitrateRange).toBeNull();
  });
});
