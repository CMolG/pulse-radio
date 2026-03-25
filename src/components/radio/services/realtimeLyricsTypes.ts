/* Copyright (c) 2026 Carlos Molina Galindo. Open source: Pulse Radio. */
import type { LyricsData } from '../types'; export type RealtimeSyncStatus = 'idle' | 'unsupported' | 'ready' | 'listening' | 'recovering' | 'disabled' | 'error'; export type RealtimeSyncQualityMode = 'high' | 'balanced' | 'conservative'; export type RealtimeSpeechHypothesis = { text: string; confidence: number; isFinal: boolean; tsMs: number; }; export type RealtimeSyncDiagnostics = { qualityMode: RealtimeSyncQualityMode; lastHypothesisMs: number | null; hypothesesSeen: number; confirmedTransitions: number; rejectedJumps: number; relockCount: number; errorMessage: string | null; }; export type RealtimeSyncState = {
  enabled: boolean; supported: boolean; status: RealtimeSyncStatus; activeLineIndex: number; candidateLineIndex: number; confidence: number; effectiveCurrentTime: number | undefined; diagnostics: RealtimeSyncDiagnostics; };
export type RealtimeSyncControls = { toggle: () => void; }; export type RealtimeSyncResult = RealtimeSyncState & RealtimeSyncControls; export type RealtimeAlignPolicy = {
  candidateMinScore: number; confirmMinScore: number; minStableSamples: number; maxJumpDistance: number; relockWindow: number; };
export const DEFAULT_REALTIME_ALIGN_POLICY: RealtimeAlignPolicy = {
  candidateMinScore: 0.74, confirmMinScore: 0.84, minStableSamples: 2, maxJumpDistance: 4, relockWindow: 8, };
export function defaultRealtimeDiagnostics(): RealtimeSyncDiagnostics { return {
    qualityMode: 'balanced', lastHypothesisMs: null, hypothesesSeen: 0, confirmedTransitions: 0, rejectedJumps: 0, relockCount: 0, errorMessage: null, }; }
export function defaultRealtimeState(enabled: boolean): RealtimeSyncState { return {
    enabled, supported: false, status: 'idle', activeLineIndex: -1, candidateLineIndex: -1, confidence: 0, effectiveCurrentTime: undefined, diagnostics: defaultRealtimeDiagnostics(),
  }; }
export function isRealtimeEligible(lyrics: LyricsData | null): boolean {
  return Boolean(lyrics?.synced && lyrics.lines.length > 0); }
