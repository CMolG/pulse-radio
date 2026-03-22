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

/** Browser blocked autoplay — treat as paused, not error */
function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError';
}

function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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
  const proxyFallbackUrlsRef = useRef<Set<string>>(new Set());
  const [preferDirectStream] = useState(() => isIOSDevice());
  const [station, setStation] = useState<Station | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.VOLUME, 0.8)
  );
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  // Tracks whether the user explicitly requested a pause (vs stall/src-change pauses)
  const userPausedRef = useRef(false);

  // Cross-tab coordination: pause this tab when another tab starts playing
  const bcRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('pulse-radio-playback');
    bcRef.current = bc;
    bc.onmessage = (e: MessageEvent) => {
      if (e.data?.type === 'playing' && e.data?.tabId !== tabIdRef.current) {
        const audio = audioRef.current;
        if (audio && !audio.paused) {
          userPausedRef.current = true;
          audio.pause();
        }
      }
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const handlePlayRejected = useCallback((err: unknown) => {
    setStatus(isAutoplayBlocked(err) ? 'paused' : 'error');
  }, []);

  const startPlayback = useCallback(
    (
      audio: HTMLAudioElement,
      streamUrl: string,
      onRejected: (err: unknown) => void,
    ) => {
      const shouldUseProxy =
        !preferDirectStream || proxyFallbackUrlsRef.current.has(streamUrl);

      const setSourceAndPlay = (useProxy: boolean) => {
        audio.crossOrigin = useProxy ? 'anonymous' : null;
        audio.src = useProxy ? proxyUrl(streamUrl) : streamUrl;
        return audio.play();
      };

      setSourceAndPlay(shouldUseProxy).catch((err) => {
        // On iOS, direct playback is more stable in background.
        // If direct fails for non-autoplay reasons, fallback to proxy for this station.
        if (!shouldUseProxy && preferDirectStream && !isAutoplayBlocked(err)) {
          proxyFallbackUrlsRef.current.add(streamUrl);
          setSourceAndPlay(true).catch(onRejected);
          return;
        }
        onRejected(err);
      });
    },
    [preferDirectStream],
  );

  useEffect(() => {
    const audio = getAudio();

    const clearReconnectTimer = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };

    const reconnect = (delay: number) => {
      if (!station || userPausedRef.current) return;
      // Don't retry when browser is offline — onOnline will resume
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (retryRef.current >= 10) {
        setStatus('error');
        return;
      }
      retryRef.current++;
      setStatus('loading');
      clearReconnectTimer();
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (userPausedRef.current) return;
        startPlayback(audio, station.url_resolved, handlePlayRejected);
      }, delay);
    };

    const onPlaying = () => {
      setStatus('playing');
      retryRef.current = 0;
      userPausedRef.current = false;
      bcRef.current?.postMessage({ type: 'playing', tabId: tabIdRef.current });
    };

    const onPause = () => {
      if (userPausedRef.current) {
        userPausedRef.current = false;
        setStatus('paused');
      } else if (station) {
        // OS/browser interrupted playback (screen lock, phone call, etc.)
        // Attempt automatic resume after a brief delay.
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

    // Ended: connection dropped — seamlessly reconnect
    const onEnded = () => {
      if (!userPausedRef.current && station) {
        reconnect(500);
      }
    };

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);

    const onCanPlay = () => {
      if (!userPausedRef.current && station && audio.paused) {
        audio.play().catch(() => {});
      }
    };

    const onPageShow = () => {
      if (!station || userPausedRef.current) return;
      if (audio.paused || audio.readyState < 2) {
        setStatus('loading');
        retryRef.current = 0;
        audio.play().catch(() => startPlayback(audio, station.url_resolved, handlePlayRejected));
      }
    };

    // Resume playback when page returns from background (screen unlock, tab switch)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && station && !userPausedRef.current) {
        if (audio.paused || audio.readyState < 2) {
          setStatus('loading');
          retryRef.current = 0;
          audio.play().catch(() => startPlayback(audio, station.url_resolved, handlePlayRejected));
        }
      }
    };

    // Network status: pause retries when offline, auto-reconnect when back online
    const onOffline = () => {
      clearReconnectTimer();
    };

    const onOnline = () => {
      if (station && !userPausedRef.current && (audio.paused || audio.readyState < 2)) {
        retryRef.current = 0;
        reconnect(500);
      }
    };

    audio.addEventListener('playing', onPlaying);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('waiting', onWaiting);
    audio.addEventListener('error', onError);
    audio.addEventListener('stalled', onStalled);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('canplay', onCanPlay);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      if (stallTimer) clearTimeout(stallTimer);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
      clearReconnectTimer();
      audio.removeEventListener('playing', onPlaying);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('waiting', onWaiting);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('stalled', onStalled);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('canplay', onCanPlay);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [station, getAudio, startPlayback, handlePlayRejected]);

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
    proxyFallbackUrlsRef.current.delete(s.url_resolved);
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
          audio.volume = targetVol;
          startPlayback(audio, s.url_resolved, handlePlayRejected);
        }
      }, interval);
    } else {
      audio.volume = muted ? 0 : volume;
      startPlayback(audio, s.url_resolved, handlePlayRejected);
    }
  }, [getAudio, muted, volume, startPlayback, handlePlayRejected]);

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
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    if (pauseTimerRef.current) {
      clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
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
    station,
    status,
    volume,
    muted,
    currentTime,
    audioRef,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    setVolume,
    toggleMute,
    seek,
  };
}
