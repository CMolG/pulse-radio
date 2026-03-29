import { describe, it, expect } from 'vitest';
import {
  parseM3U,
  parsePLS,
  exportM3U,
  parsePlaylist,
  PlaylistParseError,
} from '../parsers/playlist-parser';

describe('parseM3U', () => {
  it('parses basic M3U with URLs only', () => {
    const content = `#EXTM3U
http://stream1.example.com:8000/live
http://stream2.example.com:8000/live`;
    const result = parseM3U(content);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe('http://stream1.example.com:8000/live');
    expect(result[0].name).toBe('stream1.example.com');
  });

  it('parses extended M3U with EXTINF', () => {
    const content = `#EXTM3U
#EXTINF:-1,Jazz FM
http://jazz.example.com/stream
#EXTINF:120,Rock Radio
http://rock.example.com/stream`;
    const result = parseM3U(content);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Jazz FM');
    expect(result[1].name).toBe('Rock Radio');
    expect(result[1].duration).toBe(120);
  });

  it('skips comment lines', () => {
    const content = `#EXTM3U
# This is a comment
http://stream.example.com/live`;
    const result = parseM3U(content);
    expect(result).toHaveLength(1);
  });

  it('handles Windows line endings', () => {
    const content = '#EXTM3U\r\n#EXTINF:-1,Station A\r\nhttp://a.example.com/stream\r\n';
    const result = parseM3U(content);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Station A');
  });
});

describe('parsePLS', () => {
  it('parses PLS format', () => {
    const content = `[playlist]
File1=http://stream1.example.com:8000
Title1=Jazz FM
Length1=-1
File2=http://stream2.example.com:8000
Title2=Rock Radio
Length2=120
NumberOfEntries=2
Version=2`;
    const result = parsePLS(content);
    expect(result).toHaveLength(2);
    expect(result[0].url).toBe('http://stream1.example.com:8000');
    expect(result[0].name).toBe('Jazz FM');
    expect(result[1].name).toBe('Rock Radio');
    expect(result[1].duration).toBe(120);
  });
});

describe('exportM3U', () => {
  it('generates valid M3U content', () => {
    const entries = [
      { url: 'http://stream.example.com/live', name: 'Test Station', duration: 120 },
    ];
    const output = exportM3U(entries);
    expect(output).toContain('#EXTM3U');
    expect(output).toContain('#EXTINF:120,Test Station');
    expect(output).toContain('http://stream.example.com/live');
  });
});

describe('parsePlaylist', () => {
  it('auto-detects PLS by extension', () => {
    const content = `[playlist]\nFile1=http://a.com/stream\nTitle1=Test`;
    const result = parsePlaylist(content, 'stations.pls');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Test');
  });

  it('defaults to M3U for unknown extensions', () => {
    const content = '#EXTM3U\nhttp://a.com/stream';
    const result = parsePlaylist(content, 'stations.txt');
    expect(result).toHaveLength(1);
  });
});
