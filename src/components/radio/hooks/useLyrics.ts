/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { normalizeText, primaryArtist, cleanFeatFromTitle } from '@/logic/format-utils';
import type {
  NowPlayingTrack,
  LyricsData,
  LrcLibResponse,
  LyricLine,
} from '@/components/radio/constants';
import { STORAGE_KEYS } from '@/components/radio/constants';
import { loadFromStorage, saveToStorage } from '@/logic/storage-utils';

// ---------------------------------------------------------------------------
// Shared tiny helpers (duplicated to avoid coupling to RadioShell internals)
// ---------------------------------------------------------------------------

const _EVT_ONCE: AddEventListenerOptions = { once: true };
const _NOOP = () => {};

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type RealtimeSyncStatus =
  | 'idle'
  | 'unsupported'
  | 'ready'
  | 'listening'
  | 'recovering'
  | 'disabled'
  | 'error';

export type RealtimeSyncQualityMode = 'high' | 'balanced' | 'conservative';

export type RealtimeSpeechHypothesis = {
  text: string;
  confidence: number;
  isFinal: boolean;
  tsMs: number;
};

export type RealtimeSyncDiagnostics = {
  qualityMode: RealtimeSyncQualityMode;
  lastHypothesisMs: number | null;
  hypothesesSeen: number;
  confirmedTransitions: number;
  rejectedJumps: number;
  relockCount: number;
  errorMessage: string | null;
};

export type RealtimeSyncState = {
  enabled: boolean;
  supported: boolean;
  status: RealtimeSyncStatus;
  activeLineIndex: number;
  candidateLineIndex: number;
  confidence: number;
  effectiveCurrentTime: number | undefined;
  diagnostics: RealtimeSyncDiagnostics;
};

export type RealtimeSyncControls = { toggle: () => void };

export type RealtimeSyncResult = RealtimeSyncState & RealtimeSyncControls;

export type RealtimeAlignPolicy = {
  candidateMinScore: number;
  confirmMinScore: number;
  minStableSamples: number;
  maxJumpDistance: number;
  relockWindow: number;
};

export type CacheEntry = { key: string; data: LyricsData; ts: number };

export type { LyricLine as LrcLine };

export type LyricsResult = {
  lyrics: LyricsData | null;
  loading: boolean;
  error: boolean;
  retry: () => void;
  effectiveCurrentTime: number | undefined;
  realtime?: {
    enabled: boolean;
    supported: boolean;
    status: RealtimeSyncStatus;
    activeLineIndex: number;
    candidateLineIndex: number;
    confidence: number;
    diagnostics: RealtimeSyncDiagnostics;
    toggle: () => void;
  };
};

// ---------------------------------------------------------------------------
// Realtime lyrics sync – alignment engine & speech recognition
// ---------------------------------------------------------------------------

const DEFAULT_REALTIME_ALIGN_POLICY: RealtimeAlignPolicy = {
  candidateMinScore: 0.74,
  confirmMinScore: 0.84,
  minStableSamples: 2,
  maxJumpDistance: 4,
  relockWindow: 8,
};

function defaultRealtimeDiagnostics(): RealtimeSyncDiagnostics {
  return {
    qualityMode: 'balanced',
    lastHypothesisMs: null,
    hypothesesSeen: 0,
    confirmedTransitions: 0,
    rejectedJumps: 0,
    relockCount: 0,
    errorMessage: null,
  };
}

function defaultRealtimeState(enabled: boolean): RealtimeSyncState {
  return {
    enabled,
    supported: false,
    status: 'idle',
    activeLineIndex: -1,
    candidateLineIndex: -1,
    confidence: 0,
    effectiveCurrentTime: undefined,
    diagnostics: defaultRealtimeDiagnostics(),
  };
}

function isRealtimeEligible(lyrics: LyricsData | null): boolean {
  return Boolean(lyrics?.synced && lyrics.lines.length > 0);
}

// ---------------------------------------------------------------------------
// Browser Speech Recognition type shims
// ---------------------------------------------------------------------------

type BrowserSpeechAlternative = { transcript: string; confidence?: number };
type BrowserSpeechResult = { 0?: BrowserSpeechAlternative; isFinal: boolean };
type BrowserSpeechRecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<BrowserSpeechResult>;
};
type BrowserSpeechRecognitionErrorEvent = { error: string };
type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => BrowserSpeechRecognition;
type EngineCallbacks = {
  onHypothesis: (hypothesis: RealtimeSpeechHypothesis) => void;
  onFatalError: (errorMessage: string) => void;
};

const MAX_RESTARTS = 4;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const w = window as Window & {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function isRealtimeSpeechSupported(): boolean {
  return getRecognitionCtor() !== null;
}

// ---------------------------------------------------------------------------
// Realtime speech engine
// ---------------------------------------------------------------------------

type RealtimeSpeechEngine = {
  start: (lang: 'en' | 'es') => void;
  stop: () => void;
  destroy: () => void;
};

function createRealtimeSpeechEngine(callbacks: EngineCallbacks): RealtimeSpeechEngine {
  let recognition: BrowserSpeechRecognition | null = null;
  let running = false;
  let destroyed = false;
  let restartCount = 0;
  const teardown = () => {
    if (!recognition) return;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.stop();
    recognition = null;
  };
  const wireRecognition = (lang: 'en' | 'es') => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      callbacks.onFatalError('Speech recognition is not supported in this browser.');
      return;
    }
    recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      restartCount = 0;
      const index = event.resultIndex;
      const result = event.results[index];
      if (!result || !result[0]) return;
      const transcript = result[0].transcript.trim().toLowerCase();
      if (!transcript) return;
      callbacks.onHypothesis({
        text: transcript,
        confidence:
          typeof result[0].confidence === 'number' && Number.isFinite(result[0].confidence)
            ? Math.max(0, Math.min(1, result[0].confidence))
            : result.isFinal
              ? 0.7
              : 0.55,
        isFinal: result.isFinal,
        tsMs: performance.now(),
      });
    };
    recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
      if (destroyed || !running) return;
      const fatal =
        event.error === 'not-allowed' ||
        event.error === 'service-not-allowed' ||
        event.error === 'language-not-supported';
      if (fatal) {
        running = false;
        callbacks.onFatalError(`Speech recognition error: ${event.error}`);
        return;
      }
    };
    recognition.onend = () => {
      if (destroyed || !running) return;
      if (restartCount >= MAX_RESTARTS) {
        running = false;
        callbacks.onFatalError('Speech recognition stopped too many times.');
        return;
      }
      restartCount++;
      const current = recognition;
      if (!current) return;
      try {
        current.start();
      } catch {
        running = false;
        callbacks.onFatalError('Speech recognition failed to restart.');
      }
    };
  };
  return {
    start: (lang) => {
      if (destroyed || running) return;
      wireRecognition(lang);
      if (!recognition) return;
      try {
        recognition.start();
        running = true;
        restartCount = 0;
      } catch {
        running = false;
        callbacks.onFatalError('Speech recognition failed to start.');
      }
    },
    stop: () => {
      running = false;
      teardown();
    },
    destroy: () => {
      destroyed = true;
      running = false;
      teardown();
    },
  };
}

// ---------------------------------------------------------------------------
// Alignment algorithms
// ---------------------------------------------------------------------------

type AlignerStepInput = {
  lyrics: LyricsData;
  hypothesisText: string;
  previousConfirmedIndex: number;
  previousCandidateIndex: number;
  stableSamples: number;
  policy: RealtimeAlignPolicy;
};

type AlignerStepResult = {
  candidateIndex: number;
  confirmedIndex: number;
  score: number;
  stableSamples: number;
  jumpRejected: boolean;
  relockTriggered: boolean;
};

const STOPWORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'to',
  'of',
  'in',
  'on',
  'for',
  'with',
  'el',
  'la',
  'los',
  'las',
  'de',
  'del',
  'y',
  'en',
  'por',
  'con',
  'un',
  'una',
]);

const WORD_RE = /[a-z0-9']+/g;

function tokenize(value: string): string[] {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  const matches = normalized.match(WORD_RE) ?? [];
  return matches.filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function scoreLine(
  lineTokens: string[],
  hypoTokens: string[],
  prebuiltLineSet?: Set<string>,
): number {
  if (!lineTokens.length || !hypoTokens.length) return 0;
  const lineSet = prebuiltLineSet ?? new Set(lineTokens);
  let overlaps = 0;
  for (const token of hypoTokens) {
    if (lineSet.has(token)) overlaps++;
  }
  const overlapScore = overlaps / Math.max(lineSet.size, 1);
  let ordered = 0;
  let lineIdx = 0;
  for (const token of hypoTokens) {
    for (let i = lineIdx; i < lineTokens.length; i++) {
      if (lineTokens[i] === token) {
        ordered++;
        lineIdx = i + 1;
        break;
      }
    }
  }
  const orderScore = ordered / Math.max(hypoTokens.length, 1);
  const shortPenalty = lineTokens.length <= 2 ? 0.2 : 0;
  return Math.max(0, overlapScore * 0.7 + orderScore * 0.3 - shortPenalty);
}

function windowBounds(total: number, center: number, relockWindow: number): [number, number] {
  if (total <= 0) return [0, 0];
  if (center < 0) return [0, Math.min(total - 1, relockWindow)];
  const start = Math.max(0, center - relockWindow);
  const end = Math.min(total - 1, center + relockWindow);
  return [start, end];
}

const _lyricsTokenCache = new WeakMap<LyricsData, string[][]>();
const _lyricsSetCache = new WeakMap<LyricsData, Set<string>[]>();

function getCachedLineTokens(lyrics: LyricsData): string[][] {
  let cached = _lyricsTokenCache.get(lyrics);
  if (!cached) {
    cached = lyrics.lines.map((line) => tokenize(line.text));
    _lyricsTokenCache.set(lyrics, cached);
    _lyricsSetCache.set(
      lyrics,
      cached.map((tokens) => new Set(tokens)),
    );
  }
  return cached;
}

function getCachedLineSets(lyrics: LyricsData): Set<string>[] {
  getCachedLineTokens(lyrics);
  return _lyricsSetCache.get(lyrics)!;
}

function alignHypothesis(input: AlignerStepInput): AlignerStepResult {
  const {
    lyrics,
    hypothesisText,
    previousConfirmedIndex,
    previousCandidateIndex,
    stableSamples,
    policy,
  } = input;
  const hypoTokens = tokenize(hypothesisText);
  if (!hypoTokens.length) {
    return {
      candidateIndex: previousCandidateIndex,
      confirmedIndex: previousConfirmedIndex,
      score: 0,
      stableSamples,
      jumpRejected: false,
      relockTriggered: false,
    };
  }
  const allLineTokens = getCachedLineTokens(lyrics);
  const allLineSets = getCachedLineSets(lyrics);
  const center = previousConfirmedIndex >= 0 ? previousConfirmedIndex : previousCandidateIndex;
  const [start, end] = windowBounds(lyrics.lines.length, center, policy.relockWindow);
  let bestIndex = -1;
  let bestScore = 0;
  for (let i = start; i <= end; i++) {
    const lineTokens = allLineTokens[i] ?? [];
    const lineSet = allLineSets[i];
    const score = scoreLine(lineTokens, hypoTokens, lineSet);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  if (bestIndex < 0 || bestScore < policy.candidateMinScore) {
    return {
      candidateIndex: previousCandidateIndex,
      confirmedIndex: previousConfirmedIndex,
      score: bestScore,
      stableSamples,
      jumpRejected: false,
      relockTriggered: false,
    };
  }
  const sameCandidate = bestIndex === previousCandidateIndex;
  const nextStable = sameCandidate ? stableSamples + 1 : 1;
  const jumpDistance =
    previousConfirmedIndex >= 0 ? Math.abs(bestIndex - previousConfirmedIndex) : 0;
  const jumpRejected = previousConfirmedIndex >= 0 && jumpDistance > policy.maxJumpDistance;
  let confirmed = previousConfirmedIndex;
  let relockTriggered = false;
  if (
    !jumpRejected &&
    bestScore >= policy.confirmMinScore &&
    nextStable >= policy.minStableSamples
  ) {
    confirmed = bestIndex;
  } else if (jumpRejected && bestScore >= Math.min(0.98, policy.confirmMinScore + 0.08)) {
    confirmed = bestIndex;
    relockTriggered = true;
  }
  return {
    candidateIndex: bestIndex,
    confirmedIndex: confirmed,
    score: bestScore,
    stableSamples: nextStable,
    jumpRejected,
    relockTriggered,
  };
}

function mapLineToEffectiveTime(lyrics: LyricsData, lineIndex: number): number | undefined {
  if (!lyrics.synced || !lyrics.lines.length || lineIndex < 0 || lineIndex >= lyrics.lines.length)
    return undefined;
  return lyrics.lines[lineIndex].time;
}

// ---------------------------------------------------------------------------
// useRealtimeLyricsSync hook
// ---------------------------------------------------------------------------

type RealtimeLyricsSyncParams = {
  lyrics: LyricsData | null;
  enabled: boolean;
  languageHint: 'en' | 'es';
};

export function useRealtimeLyricsSync({
  lyrics,
  enabled,
  languageHint,
}: RealtimeLyricsSyncParams): RealtimeSyncResult {
  const initialEnabled = useMemo(
    () => loadFromStorage<boolean>(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, false),
    [],
  );
  const [manuallyEnabled, setManuallyEnabled] = useState<boolean>(initialEnabled);
  const [runtimeState, setRuntimeState] = useState(() => defaultRealtimeState(initialEnabled));
  const engineRef = useRef<RealtimeSpeechEngine | null>(null);
  const stableSamplesRef = useRef(0);
  const eligible = isRealtimeEligible(lyrics);
  const supported = isRealtimeSpeechSupported();
  const realtimeAllowed = enabled && manuallyEnabled;
  const realtimeActive = supported && eligible && realtimeAllowed;
  const [prevResetKey, setPrevResetKey] = useState('');
  const resetKey = `${realtimeActive}::${lyrics?.trackName ?? ''}::${languageHint}::${manuallyEnabled}`;
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setRuntimeState(defaultRealtimeState(manuallyEnabled));
  }
  const toggle = useCallback(() => {
    setManuallyEnabled((prev) => {
      const next = !prev;
      saveToStorage(STORAGE_KEYS.REALTIME_LYRICS_ENABLED, next);
      return next;
    });
  }, []);
  useEffect(() => {
    if (!realtimeActive) {
      engineRef.current?.stop();
      return;
    }
    engineRef.current?.destroy();
    stableSamplesRef.current = 0;
    const engine = createRealtimeSpeechEngine({
      onHypothesis: (hypothesis) => {
        if (!lyrics || !isRealtimeEligible(lyrics)) return;
        setRuntimeState((prev) => {
          const step = alignHypothesis({
            lyrics,
            hypothesisText: hypothesis.text,
            previousConfirmedIndex: prev.activeLineIndex,
            previousCandidateIndex: prev.candidateLineIndex,
            stableSamples: stableSamplesRef.current,
            policy: DEFAULT_REALTIME_ALIGN_POLICY,
          });
          stableSamplesRef.current = step.stableSamples;
          const effectiveCurrentTime = mapLineToEffectiveTime(lyrics, step.confirmedIndex);
          if (
            prev.status === 'listening' &&
            prev.activeLineIndex === step.confirmedIndex &&
            prev.candidateLineIndex === step.candidateIndex &&
            prev.confidence === step.score &&
            !step.jumpRejected &&
            !step.relockTriggered
          ) {
            return prev;
          }
          return {
            ...prev,
            status: 'listening',
            activeLineIndex: step.confirmedIndex,
            candidateLineIndex: step.candidateIndex,
            confidence: step.score,
            effectiveCurrentTime,
            diagnostics: {
              ...prev.diagnostics,
              lastHypothesisMs: hypothesis.tsMs,
              hypothesesSeen: prev.diagnostics.hypothesesSeen + 1,
              confirmedTransitions:
                prev.diagnostics.confirmedTransitions +
                (step.confirmedIndex !== prev.activeLineIndex ? 1 : 0),
              rejectedJumps: prev.diagnostics.rejectedJumps + (step.jumpRejected ? 1 : 0),
              relockCount: prev.diagnostics.relockCount + (step.relockTriggered ? 1 : 0),
              errorMessage: null,
            },
          };
        });
      },
      onFatalError: (errorMessage) => {
        setRuntimeState((prev) => ({
          ...prev,
          status: 'error',
          activeLineIndex: -1,
          candidateLineIndex: -1,
          confidence: 0,
          effectiveCurrentTime: undefined,
          diagnostics: { ...prev.diagnostics, errorMessage },
        }));
      },
    });
    engineRef.current = engine;
    engine.start(languageHint);
    return () => {
      engine.stop();
    };
  }, [lyrics, languageHint, realtimeActive]);
  useEffect(
    () => () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    },
    [],
  );
  const isSyncing =
    realtimeActive && (runtimeState.status === 'listening' || runtimeState.status === 'recovering');
  return {
    ...runtimeState,
    enabled: manuallyEnabled,
    supported,
    status: !supported
      ? 'unsupported'
      : !realtimeActive
        ? 'idle'
        : runtimeState.status === 'idle'
          ? 'ready'
          : runtimeState.status,
    activeLineIndex: isSyncing ? runtimeState.activeLineIndex : -1,
    candidateLineIndex: isSyncing ? runtimeState.candidateLineIndex : -1,
    confidence: isSyncing ? runtimeState.confidence : 0,
    effectiveCurrentTime: isSyncing ? runtimeState.effectiveCurrentTime : undefined,
    diagnostics: {
      ...runtimeState.diagnostics,
      errorMessage: !supported
        ? 'Realtime lyrics sync is not supported in this browser.'
        : runtimeState.diagnostics.errorMessage,
    },
    toggle,
  };
}

// ---------------------------------------------------------------------------
// LRC parsing & lyrics fetching
// ---------------------------------------------------------------------------

const TS_REGEX = /\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?]/g;

function parseLrc(lrcText: string): LyricLine[] {
  const lines: LyricLine[] = [];
  let sorted = true;
  let prevTime = -1;
  for (const raw of lrcText.split('\n')) {
    const timestamps: number[] = [];
    let lastIndex = 0;
    let m;
    TS_REGEX.lastIndex = 0;
    while ((m = TS_REGEX.exec(raw)) !== null) {
      const minutes = parseInt(m[1], 10);
      const seconds = parseInt(m[2], 10);
      if (seconds >= 60) continue;
      let centiseconds = 0;
      if (m[3]) {
        centiseconds = parseInt(m[3], 10);
        if (m[3].length === 1) centiseconds *= 100;
        else if (m[3].length === 2) centiseconds *= 10;
      }
      timestamps.push(minutes * 60 + seconds + centiseconds / 1000);
      lastIndex = TS_REGEX.lastIndex;
    }
    if (timestamps.length === 0) continue;
    const text = raw.slice(lastIndex).trim();
    if (!text) continue;
    for (const time of timestamps) {
      if (time < prevTime) sorted = false;
      prevTime = time;
      lines.push({ time, text });
    }
  }
  return sorted ? lines : lines.sort((a, b) => a.time - b.time);
}

const LYRICS_FETCH_TIMEOUT_MS = 8_000;

function isTransientError(err: unknown): boolean {
  if (err instanceof DOMException && err.name === 'TimeoutError') return true;
  if (err instanceof TypeError) return true;
  return false;
}

function fetchWithCancel(url: string, parentSignal?: AbortSignal): Promise<Response> {
  if (!parentSignal) return fetch(url, { signal: AbortSignal.timeout(LYRICS_FETCH_TIMEOUT_MS) });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), LYRICS_FETCH_TIMEOUT_MS);
  const onParentAbort = () => controller.abort();
  if (parentSignal.aborted) {
    clearTimeout(timeout);
    controller.abort();
    return fetch(url, { signal: controller.signal });
  }
  parentSignal.addEventListener('abort', onParentAbort, _EVT_ONCE);
  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
    parentSignal.removeEventListener('abort', onParentAbort);
  });
}

async function fetchLyricsApi(
  artist: string,
  title: string,
  album?: string,
  duration?: number,
  fallbackArtist?: string,
  signal?: AbortSignal,
): Promise<LyricsData | null> {
  const a1 = artist?.trim();
  const a2 = fallbackArtist?.trim();
  const artistCandidates: string[] = [];
  if (a1) {
    artistCandidates.push(a1);
    const primary = primaryArtist(a1);
    if (primary && primary !== a1) artistCandidates.push(primary);
  }
  if (a2 && a2 !== a1) artistCandidates.push(a2);
  if (!artistCandidates.length || !title?.trim()) return null;
  for (const artistCandidate of artistCandidates) {
    if (signal?.aborted) return null;
    try {
      const match = await fetchLyricsForArtist(artistCandidate, title, album, duration, signal);
      if (match) return match;
    } catch (err) {
      if (isTransientError(err)) throw err;
    }
  }
  return null;
}

async function tryFetch<T>(
  url: string,
  signal: AbortSignal | undefined,
  parse: (d: T) => LyricsData | null,
): Promise<LyricsData | null> {
  try {
    const res = await fetchWithCancel(url, signal);
    if (res.ok) return parse(await res.json());
    await res.text().catch(_NOOP);
  } catch (err) {
    if (isTransientError(err)) throw err;
  }
  return null;
}

async function fetchLyricsForArtist(
  artist: string,
  title: string,
  album?: string,
  duration?: number,
  signal?: AbortSignal,
): Promise<LyricsData | null> {
  const cleanTitle = cleanFeatFromTitle(title);
  const params = new URLSearchParams({ artist, title: cleanTitle });
  if (album) params.set('album', album);
  if (duration) params.set('duration', `${Math.round(duration)}`);
  return tryFetch<LrcLibResponse>(`/api/lyrics?${params}`, signal, (d) =>
    d && (d.syncedLyrics || d.plainLyrics) ? transform(d, artist, title) : null,
  );
}

function transform(data: LrcLibResponse, artist: string, title: string): LyricsData | null {
  const resolvedTrack = data.trackName || title;
  const resolvedArtist = data.artistName || artist;
  const resolvedAlbum = data.albumName || undefined;
  const resolvedDuration = data.duration || undefined;
  const lyricsEnriched =
    !!(data.artistName && data.artistName !== artist) ||
    !!(data.trackName && data.trackName !== title);
  if (data.syncedLyrics) {
    return {
      trackName: resolvedTrack,
      artistName: resolvedArtist,
      albumName: resolvedAlbum,
      duration: resolvedDuration,
      lyricsEnriched,
      synced: true,
      lines: parseLrc(data.syncedLyrics),
    };
  }
  if (data.plainLyrics) {
    return {
      trackName: resolvedTrack,
      artistName: resolvedArtist,
      albumName: resolvedAlbum,
      duration: resolvedDuration,
      lyricsEnriched,
      synced: false,
      lines: [],
      plainText: data.plainLyrics,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Lyrics cache helpers
// ---------------------------------------------------------------------------

const LYRICS_MAX_CACHE = 50;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function loadCache(): CacheEntry[] {
  const raw = loadFromStorage<{ key: string; data: LyricsData; ts?: number }[]>(
    STORAGE_KEYS.LYRICS_CACHE,
    [],
  );
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].ts === undefined) (raw[i] as CacheEntry).ts = 0;
  }
  return raw as CacheEntry[];
}

function saveCache(entries: CacheEntry[]) {
  saveToStorage(STORAGE_KEYS.LYRICS_CACHE, entries.slice(0, LYRICS_MAX_CACHE));
}

// ---------------------------------------------------------------------------
// useLyrics hook
// ---------------------------------------------------------------------------

export function useLyrics(
  track: NowPlayingTrack | null,
  stationName?: string | null,
  options?: { currentTime?: number; enableRealtime?: boolean; languageHint?: 'en' | 'es' },
): LyricsResult {
  const [lyrics, setLyrics] = useState<LyricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const lastKeyRef = useRef('');
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RETRIES = 2;
  const enableRealtime = Boolean(options?.enableRealtime && track?.title);
  const doFetch = (key: string, cached: CacheEntry[], controller: AbortController) => {
    if (controller.signal.aborted || !track?.title) return;
    setLoading(true);
    setError(false);
    fetchLyricsApi(
      track.artist || '',
      track.title,
      track.album,
      undefined,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        retryCountRef.current = 0;
        if (result) {
          setLyrics(result);
          const updated = cached.filter((e) => e.key !== key);
          updated.unshift({ key, data: result, ts: Date.now() });
          saveCache(updated);
        } else setLyrics(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++;
          const delay = 1000 * Math.pow(2, retryCountRef.current - 1);
          retryTimerRef.current = setTimeout(() => doFetch(key, cached, controller), delay);
        } else {
          setLyrics(null);
          setError(true);
          retryCountRef.current = 0;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && retryCountRef.current === 0) setLoading(false);
      });
  };
  const lyricsKey = (t: NowPlayingTrack): string => {
    const a = (t.artist || 'unknown').trim();
    return `${a}\n${t.title}`.toLowerCase();
  };
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    if (!track || !track.title) {
      setLoading(false);
      setLyrics(null);
      setError(false);
      lastKeyRef.current = '';
      return;
    }
    const key = lyricsKey(track);
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    const cached = loadCache();
    const hit = cached.find((e) => e.key === key);
    if (hit && Date.now() - hit.ts < CACHE_TTL_MS) {
      setLoading(false);
      setLyrics(hit.data);
      setError(false);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
    return () => {
      controller.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.artist, track?.title, track?.album, stationName]);
  const retry = () => {
    if (!track?.title) return;
    const key = lyricsKey(track);
    const cached = loadCache();
    if (abortRef.current) abortRef.current.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    retryCountRef.current = 0;
    const controller = new AbortController();
    abortRef.current = controller;
    doFetch(key, cached, controller);
  };
  const realtimeSync = useRealtimeLyricsSync({
    lyrics,
    enabled: enableRealtime,
    languageHint: options?.languageHint ?? 'en',
  });
  return {
    lyrics,
    loading,
    error,
    retry,
    effectiveCurrentTime: enableRealtime
      ? (realtimeSync.effectiveCurrentTime ?? options?.currentTime)
      : options?.currentTime,
    realtime: enableRealtime
      ? {
          enabled: realtimeSync.enabled,
          supported: realtimeSync.supported,
          status: realtimeSync.status,
          activeLineIndex: realtimeSync.activeLineIndex,
          candidateLineIndex: realtimeSync.candidateLineIndex,
          confidence: realtimeSync.confidence,
          diagnostics: realtimeSync.diagnostics,
          toggle: realtimeSync.toggle,
        }
      : undefined,
  };
}
