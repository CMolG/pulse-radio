import { useRef, useCallback } from 'react';

type CodecKey = 'mp3' | 'aac' | 'ogg' | 'opus' | 'flac' | 'wav';

export interface CodecCapabilities {
  mp3: boolean;
  aac: boolean;
  ogg: boolean;
  opus: boolean;
  flac: boolean;
  wav: boolean;
}

const CODEC_MIME_MAP: Record<CodecKey, string[]> = {
  mp3: ['audio/mpeg', 'audio/mp3'],
  aac: ['audio/aac', 'audio/mp4; codecs="mp4a.40.2"'],
  ogg: ['audio/ogg; codecs="vorbis"', 'audio/ogg'],
  opus: ['audio/ogg; codecs="opus"', 'audio/webm; codecs="opus"'],
  flac: ['audio/flac', 'audio/x-flac'],
  wav: ['audio/wav', 'audio/wave'],
};

function detectCodecSupport(): CodecCapabilities {
  if (typeof document === 'undefined') {
    return { mp3: true, aac: true, ogg: true, opus: true, flac: true, wav: true };
  }
  const audio = document.createElement('audio');
  const caps = {} as CodecCapabilities;

  for (const [codec, mimes] of Object.entries(CODEC_MIME_MAP)) {
    caps[codec as CodecKey] = mimes.some(
      (mime) => audio.canPlayType(mime) === 'probably' || audio.canPlayType(mime) === 'maybe',
    );
  }
  return caps;
}

/** Normalize station codec field to our key */
export function normalizeCodec(raw: string | undefined | null): CodecKey | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  if (lower === 'mp3' || lower === 'mpeg') return 'mp3';
  if (lower === 'aac' || lower === 'aac+' || lower === 'he-aac') return 'aac';
  if (lower === 'ogg' || lower === 'vorbis' || lower === 'ogg vorbis') return 'ogg';
  if (lower === 'opus') return 'opus';
  if (lower === 'flac') return 'flac';
  if (lower === 'wav' || lower === 'pcm') return 'wav';
  return null;
}

/** Check if a station's codec is supported */
export function useCodecDetection() {
  const capsRef = useRef<CodecCapabilities | null>(null);

  const getCapabilities = useCallback((): CodecCapabilities => {
    if (!capsRef.current) {
      capsRef.current = detectCodecSupport();
    }
    return capsRef.current;
  }, []);

  const isCodecSupported = useCallback(
    (stationCodec: string | undefined | null): boolean => {
      const key = normalizeCodec(stationCodec);
      if (!key) return true; // unknown codec — attempt playback
      return getCapabilities()[key];
    },
    [getCapabilities],
  );

  const getCodecLabel = useCallback((stationCodec: string | undefined | null): string | null => {
    const key = normalizeCodec(stationCodec);
    if (!key) return null;
    return key.toUpperCase();
  }, []);

  return { getCapabilities, isCodecSupported, getCodecLabel, normalizeCodec };
}
