/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { RealtimeSpeechHypothesis } from './realtimeLyricsTypes';
type BrowserSpeechAlternative = { transcript: string; confidence?: number };
type BrowserSpeechResult = { 0?: BrowserSpeechAlternative; isFinal: boolean };
type BrowserSpeechRecognitionEvent = { resultIndex: number; results: ArrayLike<BrowserSpeechResult> };
type BrowserSpeechRecognitionErrorEvent = { error: string };
type BrowserSpeechRecognition = { continuous: boolean; interimResults: boolean; maxAlternatives: number; lang: string;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; };
type RecognitionCtor = new () => BrowserSpeechRecognition;
type EngineCallbacks = {
  onHypothesis: (hypothesis: RealtimeSpeechHypothesis) => void; onFatalError: (errorMessage: string) => void; };
const MAX_RESTARTS = 4;
function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined' || !window.isSecureContext) return null;
  const w = window as Window & { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null; }
export function isRealtimeSpeechSupported(): boolean { return getRecognitionCtor() !== null; }
export type RealtimeSpeechEngine = { start: (lang: 'en' | 'es') => void; stop: () => void; destroy: () => void; };
export function createRealtimeSpeechEngine(callbacks: EngineCallbacks): RealtimeSpeechEngine {
  let recognition: BrowserSpeechRecognition | null = null; let running = false;
  let destroyed = false; let restartCount = 0; const teardown = () => { if (!recognition) return;
    recognition.onresult = null; recognition.onerror = null; recognition.onend = null; recognition.stop();
    recognition = null;
  }; const wireRecognition = (lang: 'en' | 'es') => { const Ctor = getRecognitionCtor();
    if (!Ctor) { callbacks.onFatalError('Speech recognition is not supported in this browser.'); return; }
    recognition = new Ctor(); recognition.continuous = true; recognition.interimResults = true;
    recognition.maxAlternatives = 1; recognition.lang = lang === 'es' ? 'es-ES' : 'en-US';
    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      // Reset restart counter on any successful recognition — proves engine is alive.
      restartCount = 0;
      const index = event.resultIndex; const result = event.results[index]; if (!result || !result[0]) return;
      const transcript = result[0].transcript.trim().toLowerCase(); if (!transcript) return;
      callbacks.onHypothesis({ text: transcript,
        confidence: typeof result[0].confidence === 'number' && Number.isFinite(result[0].confidence)
          ? Math.max(0, Math.min(1, result[0].confidence))
          : result.isFinal ? 0.7 : 0.55, isFinal: result.isFinal, tsMs: performance.now(),});
    }; recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => { if (destroyed || !running) return;
      const fatal = event.error === 'not-allowed'|| event.error === 'service-not-allowed'
        || event.error === 'language-not-supported';
      if (fatal) { running = false; callbacks.onFatalError(`Speech recognition error: ${event.error}`); return;
      }
    }; recognition.onend = () => { if (destroyed || !running) return;
      if (restartCount >= MAX_RESTARTS) {
        running = false; callbacks.onFatalError('Speech recognition stopped too many times.'); return; }
      restartCount++;
      // Capture the instance in scope — if stop()/destroy() has since nulled `recognition`,
      // this is a stale onend firing and we should not restart.
      const current = recognition; if (!current) return;
      try { current.start(); } catch { running = false; callbacks.onFatalError('Speech recognition failed to restart.');
      }
    }; };
  return { start: (lang) => { if (destroyed || running) return; wireRecognition(lang); if (!recognition) return;
      try { recognition.start(); running = true; restartCount = 0;
      } catch { running = false; callbacks.onFatalError('Speech recognition failed to start.'); }
    }, stop: () => { running = false; teardown(); }, destroy: () => { destroyed = true; running = false; teardown(); },
  }; }
