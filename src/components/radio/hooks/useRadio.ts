/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Station, PlaybackStatus } from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';
import { proxyUrl, isValidStreamUrl, isAutoplayBlocked } from '@/logic/station-meta';
import { resumeAudioContext } from '@/logic/audio-context';
import { _NOOP, _uid } from '@/logic/format-utils';

export type StreamQuality = 'good' | 'fair' | 'poor' | 'offline';

export function useRadio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const retryRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playSessionRef = useRef(0);
  const proxyFallbackUrlsRef = useRef<Set<string>>(null!);
  const codecFallbackTriedRef = useRef<Set<string>>(null!);
  if (!proxyFallbackUrlsRef.current) proxyFallbackUrlsRef.current = new Set();
  if (!codecFallbackTriedRef.current) codecFallbackTriedRef.current = new Set();
  const isReconnectingRef = useRef(false);
  const srcChangingRef = useRef(false);
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [audioGen, setAudioGen] = useState(0);
  const [station, setStation] = useState<Station | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(() =>
    loadFromStorage<number>(STORAGE_KEYS.VOLUME, 0.8),
  );
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [streamQuality, setStreamQuality] = useState<StreamQuality>('good');
  const lastBufferEndRef = useRef<number>(0);
  const clearTimer = (ref: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) => {
    if (ref.current != null) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  };
  const volumeRef = useRef(volume);
  const mutedRef = useRef(muted);
  volumeRef.current = volume;
  mutedRef.current = muted;
  const userPausedRef = useRef(false);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(null!);
  if (!tabIdRef.current) tabIdRef.current = _uid();
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
        clearTimer(fadeTimerRef);
      }
    };
    return () => {
      bc.close();
      bcRef.current = null;
    };
  }, []);
  useEffect(() => {
    return () => {
      clearTimer(fadeTimerRef);
      clearTimer(pauseTimerRef);
      clearTimer(reconnectTimerRef);
      clearTimer(bufferCheckRef);
    };
  }, []);
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', '');
      audio.setAttribute('webkit-playsinline', '');
      audio.preload = 'none';
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);
  const handlePlayRejected = useCallback((err: unknown) => {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setStatus(isAutoplayBlocked(err) ? 'paused' : 'error');
  }, []);
  const startPlayback = useCallback(
    (audio: HTMLAudioElement, streamUrl: string, onRejected: (err: unknown) => void) => {
      // Always use server proxy to avoid stream interruptions when toggling effects
      const setSourceAndPlay = () => {
        srcChangingRef.current = true;
        audio.crossOrigin = 'anonymous';
        audio.src = proxyUrl(streamUrl);
        Promise.resolve().then(() => {
          srcChangingRef.current = false;
        });
        return audio.play();
      };
      setSourceAndPlay().catch((err) => {
        onRejected(err);
      });
    },
    [],
  );
  useEffect(() => {
    const audio = getAudio();
    const clearReconnectTimer = () => {
      clearTimer(reconnectTimerRef);
      clearTimer(stallTimerRef);
    };
    const sessionId = playSessionRef.current;
    const reconnect = (delay: number) => {
      if (playSessionRef.current !== sessionId || !station || userPausedRef.current) return;
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      if (isReconnectingRef.current) return;
      if (retryRef.current >= 10) {
        setStatus('error');
        isReconnectingRef.current = false;
        return;
      }
      isReconnectingRef.current = true;
      retryRef.current++;
      setStatus('loading');
      clearReconnectTimer();
      let adaptedDelay = delay;
      const conn =
        typeof navigator !== 'undefined'
          ? (
              navigator as Navigator & {
                connection?: { effectiveType?: string; downlink?: number; saveData?: boolean };
              }
            ).connection
          : undefined;
      if (conn) {
        if (conn.saveData) {
          adaptedDelay = Math.max(delay, 5000);
        } else if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          adaptedDelay = Math.max(delay, 4000);
        } else if (conn.effectiveType === '3g') adaptedDelay = Math.max(delay, 2000);
      }
      const jitter = adaptedDelay * (0.7 + Math.random() * 0.6);
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        if (userPausedRef.current || playSessionRef.current !== sessionId) {
          isReconnectingRef.current = false;
          return;
        }
        startPlayback(audio, station.url_resolved, (err) => {
          isReconnectingRef.current = false;
          handlePlayRejected(err);
        });
      }, jitter);
    };
    const onPause = () => {
      if (userPausedRef.current) {
        setStatus('paused');
        return;
      }
      if (srcChangingRef.current) return;
      if (!station) return;
      setStatus('loading');
      clearTimer(pauseTimerRef);
      pauseTimerRef.current = setTimeout(() => {
        if (userPausedRef.current || !audio.paused) return;
        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            setStatus('paused');
          } else {
            reconnect(500);
          }
        });
      }, 300);
    };
    const onWaiting = () => setStatus('loading');
    const onError = () => {
      const err = audio.error;
      if (
        err &&
        (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
          err.code === MediaError.MEDIA_ERR_DECODE)
      ) {
        if (station && !codecFallbackTriedRef.current.has(station.url_resolved)) {
          if (codecFallbackTriedRef.current.size >= 200) codecFallbackTriedRef.current.clear();
          codecFallbackTriedRef.current.add(station.url_resolved);
          srcChangingRef.current = true;
          audio.crossOrigin = 'anonymous';
          audio.src = proxyUrl(station.url_resolved);
          Promise.resolve().then(() => {
            srcChangingRef.current = false;
          });
          setStatus('loading');
          audio.play().catch((fallbackErr) => {
            if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') return;
            setStatus('error');
          });
          return;
        }
        setStatus('error');
        return;
      }
      reconnect(1000 * Math.min(retryRef.current + 1, 5));
    };
    let stallCount = 0;
    const onStalled = () => {
      clearTimer(stallTimerRef);
      stallCount++;
      let bufferAhead = 0;
      if (audio.buffered.length > 0)
        bufferAhead = audio.buffered.end(audio.buffered.length - 1) - audio.currentTime;
      const baseTimeout = bufferAhead <= 0 ? 1000 : bufferAhead < 2 ? 2000 : 6000;
      const timeout = Math.max(500, baseTimeout / Math.min(stallCount, 4));
      stallTimerRef.current = setTimeout(() => {
        stallTimerRef.current = null;
        if (audio.paused || audio.readyState < 3) {
          reconnect(1500);
        }
      }, timeout);
    };
    const onPlaying = () => {
      setStatus('playing');
      retryRef.current = 0;
      stallCount = 0;
      userPausedRef.current = false;
      isReconnectingRef.current = false;
      bcRef.current?.postMessage({ type: 'playing', tabId: tabIdRef.current });
    };
    const onEnded = () => {
      if (!userPausedRef.current && station) reconnect(500);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onCanPlay = () => {
      if (!userPausedRef.current && station && audio.paused) audio.play().catch(_NOOP);
    };
    let lastResumeAttempt = 0;
    const RESUME_DEBOUNCE_MS = 1000;
    const onVisibilityResume = () => {
      if (document.visibilityState !== 'visible' || !station || userPausedRef.current) return;
      const now = Date.now();
      if (now - lastResumeAttempt < RESUME_DEBOUNCE_MS) return;
      lastResumeAttempt = now;
      if (audio.paused || audio.readyState < 2) {
        retryRef.current = 0;
        isReconnectingRef.current = false;
        setStatus('loading');
        audio.play().catch((err) => {
          if (isAutoplayBlocked(err)) {
            setStatus('paused');
          } else reconnect(500);
        });
      }
    };
    const onOffline = () => {
      clearReconnectTimer();
    };
    const onOnline = () => {
      if (station && !userPausedRef.current && (audio.paused || audio.readyState < 2)) {
        retryRef.current = 0;
        reconnect(500);
      }
    };
    const BUFFER_CHECK_MS = 2000;
    const MIN_BUFFER_AHEAD_S = 2;
    let lowBufferStreak = 0;
    clearTimer(bufferCheckRef);
    const _hasNav = typeof navigator !== 'undefined';
    bufferCheckRef.current = setInterval(() => {
      if (_hasNav && !navigator.onLine) {
        setStreamQuality('offline');
        return;
      }
      const conn = _hasNav
        ? (
            navigator as Navigator & {
              connection?: { effectiveType?: string; saveData?: boolean };
            }
          ).connection
        : undefined;
      if (conn?.saveData) setStreamQuality('fair');
      if (userPausedRef.current || audio.paused || !station) {
        lowBufferStreak = 0;
        return;
      }
      if (document.hidden) return;
      if (isReconnectingRef.current) return;
      const { buffered, currentTime: ct } = audio;
      if (buffered.length === 0) {
        lowBufferStreak++;
        setStreamQuality('poor');
        if (lowBufferStreak >= 2) {
          lowBufferStreak = 0;
          reconnect(300);
        }
        return;
      }
      let ahead = 0;
      let bufferEnd = 0;
      for (let i = 0; i < buffered.length; i++) {
        if (ct >= buffered.start(i) && ct <= buffered.end(i)) {
          ahead = buffered.end(i) - ct;
          bufferEnd = buffered.end(i);
          break;
        }
      }
      const prevEnd = lastBufferEndRef.current;
      const growth = bufferEnd - prevEnd;
      lastBufferEndRef.current = bufferEnd;
      if (ahead >= 5) {
        setStreamQuality(conn?.saveData ? 'fair' : 'good');
      } else if (ahead >= MIN_BUFFER_AHEAD_S) {
        setStreamQuality(growth > 0 ? 'fair' : 'poor');
      } else setStreamQuality('poor');
      if (ahead < MIN_BUFFER_AHEAD_S) {
        lowBufferStreak++;
        if (lowBufferStreak >= 2) {
          lowBufferStreak = 0;
          reconnect(300);
        }
      } else lowBufferStreak = 0;
    }, BUFFER_CHECK_MS);
    const pairs: [EventTarget, string, EventListener][] = [
      [audio, 'playing', onPlaying],
      [audio, 'pause', onPause],
      [audio, 'waiting', onWaiting],
      [audio, 'error', onError],
      [audio, 'stalled', onStalled],
      [audio, 'ended', onEnded],
      [audio, 'timeupdate', onTimeUpdate],
      [audio, 'canplay', onCanPlay],
      [document, 'visibilitychange', onVisibilityResume],
      [window, 'pageshow', onVisibilityResume],
      [window, 'online', onOnline],
      [window, 'offline', onOffline],
    ];
    pairs.forEach(([t, e, h]) => t.addEventListener(e, h));
    return () => {
      clearTimer(stallTimerRef);
      clearTimer(pauseTimerRef);
      clearReconnectTimer();
      clearTimer(bufferCheckRef);
      pairs.forEach(([t, e, h]) => t.removeEventListener(e, h));
    };
  }, [station, getAudio, startPlayback, handlePlayRejected, audioGen]);
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.VOLUME, volume);
    const audio = audioRef.current;
    if (audio && !fadeTimerRef.current) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);
  const play = useCallback(
    (s: Station) => {
      if (!isValidStreamUrl(s.url_resolved)) {
        setStatus('error');
        return;
      }
      const audio = getAudio();
      resumeAudioContext(audio);
      playSessionRef.current++;
      retryRef.current = 0;
      userPausedRef.current = false;
      isReconnectingRef.current = false;
      proxyFallbackUrlsRef.current.delete(s.url_resolved);
      codecFallbackTriedRef.current.delete(s.url_resolved);
      setStation(s);
      setStatus('loading');
      setStreamQuality('good');
      lastBufferEndRef.current = 0;
      clearTimer(fadeTimerRef);
      if (!audio.paused && audio.src) {
        const steps = 8;
        const interval = 40;
        let step = 0;
        const startVol = audio.volume;
        fadeTimerRef.current = setInterval(() => {
          step++;
          const t = step / steps;
          const eased = 1 - (1 - t) * (1 - t) * (1 - t);
          audio.volume = Math.max(0, startVol * (1 - eased));
          if (step >= steps) {
            clearInterval(fadeTimerRef.current!);
            fadeTimerRef.current = null;
            audio.volume = mutedRef.current ? 0 : volumeRef.current;
            startPlayback(audio, s.url_resolved, handlePlayRejected);
          }
        }, interval);
      } else {
        audio.volume = mutedRef.current ? 0 : volumeRef.current;
        startPlayback(audio, s.url_resolved, handlePlayRejected);
      }
    },
    [getAudio, startPlayback, handlePlayRejected],
  );
  const pause = useCallback(() => {
    userPausedRef.current = true;
    clearTimer(fadeTimerRef);
    audioRef.current?.pause();
  }, []);
  const resume = useCallback(() => {
    userPausedRef.current = false;
    const audio = audioRef.current;
    if (audio) {
      resumeAudioContext(audio);
      audio.volume = mutedRef.current ? 0 : volumeRef.current;
    }
    audio?.play().catch(_NOOP);
  }, []);
  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) {
      userPausedRef.current = false;
      resumeAudioContext(audio);
      audio.volume = mutedRef.current ? 0 : volumeRef.current;
      audio.play().catch(_NOOP);
    } else {
      userPausedRef.current = true;
      clearTimer(fadeTimerRef);
      audio.pause();
    }
  }, []);
  const stop = useCallback(() => {
    clearTimer(fadeTimerRef);
    clearTimer(pauseTimerRef);
    clearTimer(reconnectTimerRef);
    clearTimer(bufferCheckRef);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    setStation(null);
    setStatus('idle');
    setStreamQuality('good');
    lastBufferEndRef.current = 0;
  }, []);
  const setVolume = useCallback((v: number) => {
    setVolumeState(Math.max(0, Math.min(1, v)));
  }, []);
  const prefetchedUrlsRef = useRef<Set<string>>(null!);
  if (!prefetchedUrlsRef.current) prefetchedUrlsRef.current = new Set();
  const prefetchStream = useCallback((streamUrl: string) => {
    if (!isValidStreamUrl(streamUrl) || prefetchedUrlsRef.current.has(streamUrl)) return;
    if (prefetchedUrlsRef.current.size >= 500) {
      const evictCount = prefetchedUrlsRef.current.size - 250;
      let i = 0;
      for (const url of prefetchedUrlsRef.current) {
        if (i++ >= evictCount) break;
        prefetchedUrlsRef.current.delete(url);
      }
    }
    prefetchedUrlsRef.current.add(streamUrl);
    const controller = new AbortController();
    fetch(proxyUrl(streamUrl), { method: 'HEAD', signal: controller.signal })
      .then(() => {
        clearTimeout(timer);
      })
      .catch(() => {
        clearTimeout(timer);
      });
    const timer = setTimeout(() => controller.abort(), 2000);
  }, []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);
  const seek = useCallback((t: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(t)) return;
    const duration = audio.duration || 0;
    audio.currentTime = Math.max(0, duration ? Math.min(t, duration) : t);
  }, []);
  const ensureAudio = useCallback(() => getAudio(), [getAudio]);
  const replaceAudio = useCallback(() => {
    const old = audioRef.current;
    if (old) {
      old.pause();
      old.src = '';
      old.removeAttribute('src');
    }
    audioRef.current = null;
    setAudioGen((g) => g + 1);
  }, []);
  return {
    station,
    status,
    volume,
    muted,
    currentTime,
    streamQuality,
    audioRef,
    ensureAudio,
    replaceAudio,
    play,
    pause,
    resume,
    togglePlay,
    stop,
    setVolume,
    toggleMute,
    seek,
    prefetchStream,
  };
}
