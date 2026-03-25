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
import { resumeAudioContext, hasAudioSource } from '@/lib/audio-visualizer';
/** Route a stream URL through our CORS proxy so Web Audio API can access it */
function proxyUrl(raw: string): string { return `/api/proxy-stream?url=${encodeURIComponent(raw)}`; }
function isValidStreamUrl(url: string | undefined): url is string { if (!url) return false;
  try { const parsed = new URL(url); return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch { return false; }
}
/** Browser blocked autoplay — treat as paused, not error */
function isAutoplayBlocked(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'NotAllowedError'; }
function isIOSDevice(): boolean {
  if (typeof navigator === 'undefined') return false; const ua = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); }
export type StreamQuality = 'good' | 'fair' | 'poor' | 'offline';
export type StreamLatency = { url: string; latencyMs: number; timestamp: number; };
export function useRadio() { const audioRef = useRef<HTMLAudioElement | null>(null); const retryRef = useRef(0);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bufferCheckRef = useRef<ReturnType<typeof setInterval> | null>(null); const playSessionRef = useRef(0);
  const proxyFallbackUrlsRef = useRef<Set<string>>(new Set());
  const codecFallbackTriedRef = useRef<Set<string>>(new Set());
  // Gate: prevents concurrent reconnect attempts (cleared on success/failure)
  const isReconnectingRef = useRef(false);
  // Flag: true while startPlayback is assigning audio.src, so onPause ignores the synthetic pause
  const srcChangingRef = useRef(false);
  // Stall timer promoted to ref so clearReconnectTimer() can cancel it
  const stallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preferDirectStream] = useState(() => isIOSDevice());
  const [station, setStation] = useState<Station | null>(null);
  const [status, setStatus] = useState<PlaybackStatus>('idle');
  const [volume, setVolumeState] = useState(() =>loadFromStorage<number>(STORAGE_KEYS.VOLUME, 0.8)
  ); const [muted, setMuted] = useState(false); const [currentTime, setCurrentTime] = useState(0);
  const [streamQuality, setStreamQuality] = useState<StreamQuality>('good'); const lastBufferEndRef = useRef<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearTimer = (ref: React.MutableRefObject<any>) => {
    if (ref.current != null) { clearTimeout(ref.current); ref.current = null; }
  };
  // Latest volume/muted refs so crossfade intervals read current values
  const volumeRef = useRef(volume); const mutedRef = useRef(muted);
  volumeRef.current = volume; mutedRef.current = muted;
  // Tracks whether the user explicitly requested a pause (vs stall/src-change pauses)
  const userPausedRef = useRef(false);
  // Cross-tab coordination: pause this tab when another tab starts playing
  const bcRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);
  useEffect(() => { if (typeof BroadcastChannel === 'undefined') return;
    const bc = new BroadcastChannel('pulse-radio-playback'); bcRef.current = bc;
    bc.onmessage = (e: MessageEvent) => { if (e.data?.type === 'playing' && e.data?.tabId !== tabIdRef.current) {
        const audio = audioRef.current;
        if (audio && !audio.paused) { userPausedRef.current = true; audio.pause(); }
        // Cancel any in-progress crossfade so it doesn't restart playback
        // after the cross-tab pause. Without this, the crossfade completion
        // calls startPlayback() and overrides the pause from the other tab.
        clearTimer(fadeTimerRef); }
    }; return () => { bc.close(); bcRef.current = null; };}, []);
  // Clean up timers on unmount to prevent orphaned intervals
  useEffect(() => { return () => {
      clearTimer(fadeTimerRef); clearTimer(pauseTimerRef); clearTimer(reconnectTimerRef); clearTimer(bufferCheckRef);
    };}, []);
  const getAudio = useCallback(() => { if (!audioRef.current) {
      const audio = new Audio(); audio.crossOrigin = 'anonymous';
      audio.setAttribute('playsinline', ''); audio.preload = 'none'; audioRef.current = audio; }
    return audioRef.current;}, []);
  const handlePlayRejected = useCallback((err: unknown) => {
    // AbortError means the play was superseded — stop(), pause(), or a new
    // play() cleared audio.src while this promise was pending.  The caller
    // already set the correct status (idle/loading), so swallow silently.
    if (err instanceof DOMException && err.name === 'AbortError') return;
    setStatus(isAutoplayBlocked(err) ? 'paused' : 'error');}, []);
  const startPlayback = useCallback(
    (audio: HTMLAudioElement, streamUrl: string, onRejected: (err: unknown) => void,) => {
      // Force proxy when the Web Audio graph is connected to this element.
      // On iOS Safari, a cross-origin audio element with crossOrigin=null routed
      // through Web Audio produces silence (CORS taint). Using the proxy ensures
      // the response has CORS headers so the Web Audio pipeline outputs sound.
      const webAudioConnected = hasAudioSource(audio);
      const shouldUseProxy = !preferDirectStream || proxyFallbackUrlsRef.current.has(streamUrl) || webAudioConnected;
      const setSourceAndPlay = (useProxy: boolean) => {
        // Set flag before assigning src — the browser fires a synchronous 'pause'
        // event on src change, and onPause must ignore that synthetic pause.
        srcChangingRef.current = true;
        audio.crossOrigin = useProxy ? 'anonymous' : null; audio.src = useProxy ? proxyUrl(streamUrl) : streamUrl;
        // Clear in a microtask (after the synchronous pause event has fired)
        Promise.resolve().then(() => { srcChangingRef.current = false; }); return audio.play();
      };
      setSourceAndPlay(shouldUseProxy).catch((err) => {
        // On iOS, direct playback is more stable in background.
        // If direct fails for non-autoplay reasons, fallback to proxy for this station.
        if (!shouldUseProxy && preferDirectStream && !isAutoplayBlocked(err)) {
          if (proxyFallbackUrlsRef.current.size >= 200) proxyFallbackUrlsRef.current.clear();
          proxyFallbackUrlsRef.current.add(streamUrl); setSourceAndPlay(true).catch(onRejected); return; }
        onRejected(err);});
    }, [preferDirectStream],
  ); useEffect(() => { const audio = getAudio();
    const clearReconnectTimer = () => { clearTimer(reconnectTimerRef); clearTimer(stallTimerRef); };
    const sessionId = playSessionRef.current;
    const reconnect = (delay: number) => {
      if (playSessionRef.current !== sessionId || !station || userPausedRef.current) return;
      // Don't retry when browser is offline — onOnline will resume
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      // Prevent concurrent reconnects — only one attempt at a time
      if (isReconnectingRef.current) return;
      if (retryRef.current >= 10) { setStatus('error'); isReconnectingRef.current = false; return;
      }
      isReconnectingRef.current = true; retryRef.current++; setStatus('loading'); clearReconnectTimer();
      // Adapt reconnect delay based on network quality (Network Information API)
      let adaptedDelay = delay;
      const conn = typeof navigator !== 'undefined'
        ? (navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection
        : undefined;
      if (conn) { if (conn.saveData) {
          // User opted into data saving — longer delays to reduce bandwidth
          adaptedDelay = Math.max(delay, 5000);
        } else if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') {
          adaptedDelay = Math.max(delay, 4000);
        } else if (conn.effectiveType === '3g') adaptedDelay = Math.max(delay, 2000);
        // 4g or better: use original delay
      }
      // Add ±30% random jitter to prevent thundering-herd reconnects
      // when a station recovers and all clients try simultaneously
      const jitter = adaptedDelay * (0.7 + Math.random() * 0.6);
      reconnectTimerRef.current = setTimeout(() => { reconnectTimerRef.current = null;
        if (userPausedRef.current || playSessionRef.current !== sessionId) { isReconnectingRef.current = false; return;
        }
        startPlayback(audio, station.url_resolved, (err) => {
          isReconnectingRef.current = false; handlePlayRejected(err);});
      }, jitter);
    };
    const onPause = () => {
      // Case 1: user explicitly paused — just show paused state
      if (userPausedRef.current) { setStatus('paused'); return; }
      // Case 2: pause was caused by startPlayback assigning audio.src — ignore it.
      // The browser fires a synchronous 'pause' event when src changes; we must not
      // treat this as an OS interruption and queue a spurious reconnect.
      if (srcChangingRef.current) return;
      // Case 3: OS/browser interruption (screen lock, phone call, etc.)
      // Attempt a single resume after a brief delay.
      // On mobile, play() without a user gesture will fail with NotAllowedError.
      // In that case we show 'paused' so the user can tap the play button.
      // We do NOT call reconnect() on NotAllowedError — that would set audio.src,
      // fire another pause event, and create a loop that exhausts all retries.
      if (!station) return; setStatus('loading'); clearTimer(pauseTimerRef);
      pauseTimerRef.current = setTimeout(() => { if (userPausedRef.current || !audio.paused) return;
        audio.play().catch((err) => { if (isAutoplayBlocked(err)) {
            // Mobile: no gesture available — show play button, user resumes manually
            setStatus('paused');} else {
            // Genuine network/decode error — reconnect with a fresh source
            reconnect(500);
          }});
      }, 300);
    }; const onWaiting = () => setStatus('loading'); const onError = () => { const err = audio.error;
      if (err && (err.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED || err.code === MediaError.MEDIA_ERR_DECODE)) {
        // Before permanently failing, try the alternative stream path.
        // If currently proxied → try direct (or vice versa).
        // Only attempt this fallback once per station to avoid loops.
        if (station && !codecFallbackTriedRef.current.has(station.url_resolved)) {
          if (codecFallbackTriedRef.current.size >= 200) codecFallbackTriedRef.current.clear();
          codecFallbackTriedRef.current.add(station.url_resolved);
          const isCurrentlyProxied = audio.src.startsWith(window.location.origin + '/api/proxy-stream');
          const setSourceAndPlay = (useProxy: boolean) => {
            srcChangingRef.current = true; audio.crossOrigin = useProxy ? 'anonymous' : null;
            audio.src = useProxy ? proxyUrl(station.url_resolved) : station.url_resolved;
            Promise.resolve().then(() => { srcChangingRef.current = false; }); return audio.play();
          }; setStatus('loading');
          setSourceAndPlay(!isCurrentlyProxied).catch((fallbackErr) => {
            if (fallbackErr instanceof DOMException && fallbackErr.name === 'AbortError') return; setStatus('error');
          }); return; }
        setStatus('error'); return; }
      reconnect(1000 * Math.min(retryRef.current + 1, 5));
    };
    // Stalled: the browser stopped receiving data but hasn't errored
    // Timeout adapts to remaining buffer: more buffer → wait longer for recovery
    let stallCount = 0; const onStalled = () => { clearTimer(stallTimerRef); stallCount++; let bufferAhead = 0;
      if (audio.buffered.length > 0) bufferAhead = audio.buffered.end(audio.buffered.length - 1) - audio.currentTime;
      // Adapt timeout: empty buffer → 1s, low → 2s, healthy → 6s
      // Consecutive stalls reduce patience (exponential decay)
      const baseTimeout = bufferAhead <= 0 ? 1000 : bufferAhead < 2 ? 2000 : 6000;
      const timeout = Math.max(500, baseTimeout / Math.min(stallCount, 4));
      stallTimerRef.current = setTimeout(() => { stallTimerRef.current = null;
        if (audio.paused || audio.readyState < 3) {
          reconnect(1500); // isReconnectingRef gate prevents overlap with other paths
        }
      }, timeout);
    }; const onPlaying = () => { setStatus('playing'); retryRef.current = 0;
      stallCount = 0; // Reset stall counter on successful playback
      userPausedRef.current = false;
      isReconnectingRef.current = false; // Clear gate — reconnect path succeeded
      bcRef.current?.postMessage({ type: 'playing', tabId: tabIdRef.current });
    };
    // Ended: connection dropped — seamlessly reconnect
    const onEnded = () => { if (!userPausedRef.current && station) reconnect(500); };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onCanPlay = () => { if (!userPausedRef.current && station && audio.paused) audio.play().catch(() => {}); };
    // Single debounced handler for both visibilitychange and pageshow.
    // On iOS, both events fire on the same resume (screen unlock / tab switch),
    // so without debouncing we get two parallel reconnect attempts.
    let lastResumeAttempt = 0; const RESUME_DEBOUNCE_MS = 1000;
    const onVisibilityResume = () => {
      if (document.visibilityState !== 'visible' || !station || userPausedRef.current) return; const now = Date.now();
      if (now - lastResumeAttempt < RESUME_DEBOUNCE_MS) return; lastResumeAttempt = now;
      if (audio.paused || audio.readyState < 2) { retryRef.current = 0;
        isReconnectingRef.current = false; // Reset gate for fresh visibility-triggered resume
        setStatus('loading');
        audio.play().catch((err) => { if (isAutoplayBlocked(err)) {
            // Mobile: no gesture — show play button
            setStatus('paused');
          } else reconnect(500);});
      }
    };
    // Network status: pause retries when offline, auto-reconnect when back online
    const onOffline = () => { clearReconnectTimer(); };
    const onOnline = () => { if (station && !userPausedRef.current && (audio.paused || audio.readyState < 2)) {
        retryRef.current = 0; reconnect(500); }
    };
    // Proactive buffer health monitor: check every 2s whether the buffered-ahead
    // audio is dangerously low. If less than 2s of audio remains in the buffer
    // while playing, trigger a preemptive reconnect before the user hears a gap.
    // Also measures stream quality based on buffer growth rate.
    const BUFFER_CHECK_MS = 2000; const MIN_BUFFER_AHEAD_S = 2; let lowBufferStreak = 0; clearTimer(bufferCheckRef);
    bufferCheckRef.current = setInterval(() => {
      // Update stream quality based on network and buffer state
      if (typeof navigator !== 'undefined' && !navigator.onLine) { setStreamQuality('offline'); return; }
      // Use Network Information API to detect poor connections proactively
      const conn = typeof navigator !== 'undefined'
        ? (navigator as Navigator & { connection?: { effectiveType?: string; saveData?: boolean } }).connection
        : undefined;
      if (conn?.saveData) setStreamQuality('fair');
      if (userPausedRef.current || audio.paused || !station) { lowBufferStreak = 0; return; }
      // Skip check when tab is hidden — browser throttles network
      if (document.hidden) return;
      // Skip quality/reconnect logic during an active reconnect to avoid cascade
      if (isReconnectingRef.current) return; const { buffered, currentTime: ct } = audio;
      if (buffered.length === 0) {
        // No buffer ranges at all while playing — treat as underrun
        lowBufferStreak++; setStreamQuality('poor');
        if (lowBufferStreak >= 2) { lowBufferStreak = 0; reconnect(300); }
        return; }
      // Find the buffer range containing currentTime
      let ahead = 0; let bufferEnd = 0;
      for (let i = 0; i < buffered.length; i++) { if (ct >= buffered.start(i) && ct <= buffered.end(i)) {
          ahead = buffered.end(i) - ct; bufferEnd = buffered.end(i); break; }
      }
      // Stream quality: based on buffer-ahead and growth rate
      const prevEnd = lastBufferEndRef.current;
      const growth = bufferEnd - prevEnd; // how much buffer grew since last check
      lastBufferEndRef.current = bufferEnd;
      if (ahead >= 5) {
        // saveData means the user opted into reduced bandwidth; cap at 'fair'
        setStreamQuality(conn?.saveData ? 'fair' : 'good');
      } else if (ahead >= MIN_BUFFER_AHEAD_S) {
        // Healthy buffer but thin — check if it's growing
        setStreamQuality(growth > 0 ? 'fair' : 'poor');
      } else setStreamQuality('poor'); if (ahead < MIN_BUFFER_AHEAD_S) { lowBufferStreak++;
        // Require 2 consecutive low-buffer readings to avoid false positives
        // from momentary dips during normal streaming
        if (lowBufferStreak >= 2) { lowBufferStreak = 0; reconnect(300); }
      } else lowBufferStreak = 0;
    }, BUFFER_CHECK_MS);
    const pairs: [EventTarget, string, EventListener][] = [ [audio, 'playing', onPlaying], [audio, 'pause', onPause],
      [audio, 'waiting', onWaiting], [audio, 'error', onError],
      [audio, 'stalled', onStalled], [audio, 'ended', onEnded],
      [audio, 'timeupdate', onTimeUpdate], [audio, 'canplay', onCanPlay],
      [document, 'visibilitychange', onVisibilityResume], [window, 'pageshow', onVisibilityResume],
      [window, 'online', onOnline], [window, 'offline', onOffline],
    ]; pairs.forEach(([t, e, h]) => t.addEventListener(e, h));
    return () => {
      clearTimer(stallTimerRef); clearTimer(pauseTimerRef); clearReconnectTimer(); clearTimer(bufferCheckRef);
      pairs.forEach(([t, e, h]) => t.removeEventListener(e, h));
    };
  }, [station, getAudio, startPlayback, handlePlayRejected]);
  useEffect(() => { saveToStorage(STORAGE_KEYS.VOLUME, volume); const audio = audioRef.current;
    // Skip direct volume set while crossfade is in progress — the interval controls audio.volume
    if (audio && !fadeTimerRef.current) audio.volume = muted ? 0 : volume;
  }, [volume, muted]);
  const play = useCallback((s: Station) => { if (!isValidStreamUrl(s.url_resolved)) { setStatus('error'); return; }
    const audio = getAudio();
    // Resume Web Audio context from user gesture (required on mobile)
    resumeAudioContext(audio); playSessionRef.current++; retryRef.current = 0; userPausedRef.current = false;
    // A user-initiated play always overrides any in-progress reconnect
    isReconnectingRef.current = false; proxyFallbackUrlsRef.current.delete(s.url_resolved);
    codecFallbackTriedRef.current.delete(s.url_resolved); setStation(s); setStatus('loading');
    setStreamQuality('good'); lastBufferEndRef.current = 0;
    // Crossfade: fade out with ease-out curve before switching
    clearTimer(fadeTimerRef); if (!audio.paused && audio.src) { const steps = 8;
      const interval = 40; // 320ms total
      let step = 0; const startVol = audio.volume; fadeTimerRef.current = setInterval(() => { step++;
        // Ease-out cubic: rapid initial drop, gentle tail
        const t = step / steps; const eased = 1 - (1 - t) * (1 - t) * (1 - t);
        audio.volume = Math.max(0, startVol * (1 - eased));
        if (step >= steps) { clearInterval(fadeTimerRef.current!); fadeTimerRef.current = null;
          // Read current volume/muted from refs — user may have changed them during fade
          audio.volume = mutedRef.current ? 0 : volumeRef.current;
          startPlayback(audio, s.url_resolved, handlePlayRejected); }
      }, interval);} else {
      audio.volume = mutedRef.current ? 0 : volumeRef.current; startPlayback(audio, s.url_resolved, handlePlayRejected);
    }
  }, [getAudio, startPlayback, handlePlayRejected]); const pause = useCallback(() => { userPausedRef.current = true;
    // Cancel any in-progress crossfade so its completion doesn't call
    // startPlayback() and resume audio after this explicit pause.
    clearTimer(fadeTimerRef); audioRef.current?.pause();
  }, []); const resume = useCallback(() => { userPausedRef.current = false; const audio = audioRef.current;
    if (audio) { resumeAudioContext(audio);
      // Restore audio.volume from React state — sleep timer fade may have
      // set it to 0 directly, bypassing React state.
      audio.volume = mutedRef.current ? 0 : volumeRef.current; }
    audio?.play().catch(() => {});
  }, []); const togglePlay = useCallback(() => { const audio = audioRef.current; if (!audio || !audio.src) return;
    if (audio.paused) { userPausedRef.current = false; resumeAudioContext(audio);
      // Restore audio.volume from React state — sleep timer fade may have
      // set it to 0 directly, bypassing React state.
      audio.volume = mutedRef.current ? 0 : volumeRef.current; audio.play().catch(() => {});
    } else { userPausedRef.current = true;
      // Cancel any in-progress crossfade (same reason as pause())
      clearTimer(fadeTimerRef); audio.pause();
    }}, []);
  const stop = useCallback(() => {
    clearTimer(fadeTimerRef); clearTimer(pauseTimerRef); clearTimer(reconnectTimerRef); clearTimer(bufferCheckRef);
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.src = ''; }
    setStation(null); setStatus('idle'); setStreamQuality('good'); lastBufferEndRef.current = 0;
  }, []); const setVolume = useCallback((v: number) => { setVolumeState(Math.max(0, Math.min(1, v))); }, []);
  const prefetchedUrlsRef = useRef<Set<string>>(new Set());
  const prefetchStream = useCallback((streamUrl: string) => {
    if (!isValidStreamUrl(streamUrl) || prefetchedUrlsRef.current.has(streamUrl)) return;
    if (prefetchedUrlsRef.current.size >= 500) prefetchedUrlsRef.current.clear();
    prefetchedUrlsRef.current.add(streamUrl);
    // Warm DNS+TCP+TLS with a HEAD request and measure latency
    const controller = new AbortController();
    fetch(proxyUrl(streamUrl), { method: 'HEAD', signal: controller.signal }).then(() => { clearTimeout(timer); })
      .catch(() => { clearTimeout(timer); });
    const timer = setTimeout(() => controller.abort(), 2000);
  }, []); const toggleMute = useCallback(() => setMuted(m => !m), []);
  const seek = useCallback((t: number) => {
    const audio = audioRef.current; if (!audio || !isFinite(t)) return; const duration = audio.duration || 0;
    audio.currentTime = Math.max(0, duration ? Math.min(t, duration) : t);
  }, []); const ensureAudio = useCallback(() => getAudio(), [getAudio]);
  return { station, status, volume, muted, currentTime, streamQuality, audioRef, ensureAudio,
    play, pause, resume, togglePlay, stop, setVolume, toggleMute, seek, prefetchStream,
  }; }
