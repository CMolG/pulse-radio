/*
 * Copyright (c) 2026 Carlos Molina Galindo.
 * Open source project: Pulse Radio.
 * Created by Carlos Molina Galindo (CMolG on GitHub).
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Station, PlaybackStatus } from '../types';
import { STORAGE_KEYS } from '../constants';
import { loadFromStorage, saveToStorage } from '@/lib/storageUtils';

/** Route a stream URL through our CORS proxy so Web Audio API can access it */
function proxyUrl(raw: string): string {
  return `/api/proxy-stream?url=${encodeURIComponent(raw)}`;
}

function isValidStreamUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export type UseRadioReturn = {
  station: Station | null;
  status: PlaybackStatus;
  volume: number;
  muted: boolean;
  currentTime: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  play: (station: Station) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  stop: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  seek: (time: number) => void;
};

export function useRadio(): UseRadioReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.VOLUME, 0.8)
  );
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Tracks whether the user explicitly requested a pause (vs stall/src-change pauses)
  const userPausedRef = useRef(false);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  useEffect(() => {
    const audio = getAudio();

    const onPlaying = () => { setStatus('playing'); retryRef.current = 0; userPausedRef.current = false; };
    const onPause = () => {
      if (userPausedRef.current) {
        userPausedRef.current = false;
        setStatus('paused');
      } else if (station) {
        // OS/browser interrupted playback (screen lock, phone call, etc.)
        // Attempt automatic resume after a brief delay
        setStatus('loading');
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
          if (!userPausedRef.current && audio.paused) {
            audio.play().catch(() => {
              // Direct resume failed — reconnect with fresh source
              reconnect(500);
            });
          }
        }, 300);
      }
    };
    const onWaiting = () => setStatus('loading');

    // Auto-reconnect helper: used by error, stalled, and ended handlers
    const reconnect = (delay: number) => {
      if (!station || userPausedRef.current) return;
      if (retryRef.current >= 10) {
        setStatus('error');
        return;
      }
      retryRef.current++;
      setStatus('loading');
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (userPausedRef.current) return;
        audio.src = proxyUrl(station.url_resolved);
        audio.play().catch(() => setStatus('error'));
      }, delay);
    };

    const onError = () => {
      const err = audio.error;
      // Permanent failures: don't retry when source is unsupported or codec fails
      if (err && (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || err.code === MediaError.MEDIA_ERR_DECODE)) {
        setStatus('error');
        return;
      }
      reconnect(1000 * Math.min(retryRef.current + 1, 5));
    };

    // Stalled: the browser stopped receiving data but hasn't errored
    // Use a debounce — some stall events resolve on their own
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    const onStalled = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        // Only reconnect if still not playing
        if (audio.paused || audio.readyState < 3) {
          reconnect(1500);
        }
      }, 4000);
    };

    // Ended: proxy connection dropped (timeout) — seamlessly reconnect
    const onEnded = () => {
      if (!userPausedRef.current && station) {
        reconnect(500);
      }
    };

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);

    // Resume playback when page returns from background (screen unlock, tab switch)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && station && !userPausedRef.current) {
        if (audio.paused || audio.readyState < 2) {
          setStatus('loading');
          retryRef.current = 0;
          audio.play().catch(() => {
            // Stream likely timed out while in background — reconnect
            audio.src = proxyUrl(station.url_resolved);
            audio.play().catch(() => setStatus('error'));
          });
        }
      }
    };

    // Periodic health check: detects silent stream drops that don't fire stalled/error/ended.
    // Common on iOS PWA after 10+ minutes — the proxy TCP connection closes silently.
    const healthCheckInterval = setInterval(() => {
      if (!station || userPausedRef.current || audio.paused) return;
      // NETWORK_IDLE (1) while playing means the browser stopped fetching — stream dropped.
      if (audio.networkState === HTMLMediaElement.NETWORK_IDLE) {
        reconnect(1000);
      }
    }, 15_000);

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(healthCheckInterval);
      if (stallTimer) clearTimeout(stallTimer);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [station]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VOLUME, volume);
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const play = useCallback((s: Station) => {
    if (!isValidStreamUrl(s.url_resolved)) {
      setStatus('error');
      return;
    }
    const audio = getAudio();
    retryRef.current = 0;
    userPausedRef.current = false;
    setStation(s);
    setStatus('loading');

    // Crossfade: fade out with ease-out curve before switching
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (!audio.paused && audio.src) {
      const targetVol = muted ? 0 : volume;
      const steps = 8;
      const interval = 40; // 320ms total
      let step = 0;
      const startVol = audio.volume;
      fadeTimerRef.current = setInterval(() => {
        step++;
        // Ease-out cubic: rapid initial drop, gentle tail
        const t = step / steps;
        const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        audio.volume = Math.max(0, startVol * (1 - eased));
        if (step >= steps) {
          clearInterval(fadeTimerRef.current!);
          fadeTimerRef.current = null;
          audio.src = proxyUrl(s.url_resolved);
          audio.volume = targetVol;
          audio.play().catch(() => setStatus('error'));
        }
      }, interval);
    } else {
      audio.src = proxyUrl(s.url_resolved);
      audio.volume = muted ? 0 : volume;
      audio.play().catch(() => setStatus('error'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAudio, muted, volume]);

  const pause = useCallback(() => {
    userPausedRef.current = true;
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    userPausedRef.current = false;
    audioRef.current?.play().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      userPausedRef.current = false;
      audio.play().catch(() => {});
    } else {
      userPausedRef.current = true;
      audio.pause();
    }
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setStation(null);
    setStatus('idle');
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);

  const toggleMute = useCallback(() => setMuted(m => !m), []);

  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(t)) return;
    const duration = audio.duration || 0;
    audio.currentTime = Math.max(0, duration ? Math.min(t, duration) : t);
  }, []);

  return {
    station, status, volume, muted, currentTime, audioRef,
    play, pause, resume, togglePlay, stop, setVolume, toggleMute, seek,
  };
}
