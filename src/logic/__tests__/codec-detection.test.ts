import { describe, it, expect } from 'vitest';
import { normalizeCodec } from '@/logic/hooks/useCodecDetection';

describe('normalizeCodec', () => {
  it('maps MP3 variants', () => {
    expect(normalizeCodec('MP3')).toBe('mp3');
    expect(normalizeCodec('mp3')).toBe('mp3');
    expect(normalizeCodec('MPEG')).toBe('mp3');
  });

  it('maps AAC variants', () => {
    expect(normalizeCodec('AAC')).toBe('aac');
    expect(normalizeCodec('AAC+')).toBe('aac');
    expect(normalizeCodec('HE-AAC')).toBe('aac');
  });

  it('maps OGG variants', () => {
    expect(normalizeCodec('OGG')).toBe('ogg');
    expect(normalizeCodec('Vorbis')).toBe('ogg');
    expect(normalizeCodec('OGG Vorbis')).toBe('ogg');
  });

  it('maps OPUS', () => {
    expect(normalizeCodec('OPUS')).toBe('opus');
  });

  it('maps FLAC', () => {
    expect(normalizeCodec('FLAC')).toBe('flac');
  });

  it('returns null for unknown or empty', () => {
    expect(normalizeCodec('')).toBeNull();
    expect(normalizeCodec(null)).toBeNull();
    expect(normalizeCodec(undefined)).toBeNull();
    expect(normalizeCodec('WMA')).toBeNull();
  });
});
